"""
Navigation Graph Loader with Explicit Edges
============================================

This module loads navigation graphs from GeoJSON exported by the Indoor Map Designer.
It supports explicit edge definitions (type: "edge") instead of implicit edge generation
based on node ID adjacency.

Advantages over implicit edge generation:
- Supports cross-corridor connections (e.g., a5 -> b3)
- Supports elevator and stair connections
- Supports complex topologies
- Visual editor is single source of truth
- No dependency on node ID naming conventions

Author: Indoor Map Designer
Version: 2.0
"""

import json
import math
from typing import Dict, List, Tuple, Optional, Any


class NavigationNode:
    """Represents a navigation node (NavNode) in the graph"""

    def __init__(self, node_id: str, position: Tuple[float, float], floor: int = 1, **kwargs):
        self.id = node_id
        self.position = position  # (x, y) coordinates
        self.floor = floor
        self.rotation = kwargs.get('rotation', '0,1')
        self.index = kwargs.get('index', 0)
        self.intersection_with = kwargs.get('inct', None)
        self.metadata = kwargs  # Store all other properties

    def __repr__(self):
        return f"NavNode(id={self.id}, pos={self.position}, floor={self.floor})"


class NavigationEdge:
    """Represents an explicit edge between two nodes"""

    def __init__(self, edge_id: str, start_node: str, end_node: str,
                 distance: float, bidirectional: bool = True, **kwargs):
        self.id = edge_id
        self.start = start_node
        self.end = end_node
        self.distance = distance
        self.bidirectional = bidirectional
        self.weight = kwargs.get('weight', distance)  # Allow custom weight
        self.floor = kwargs.get('floor', 1)
        self.metadata = kwargs

    def __repr__(self):
        direction = '<->' if self.bidirectional else '->'
        return f"Edge({self.start} {direction} {self.end}, d={self.distance:.2f}m)"


class NavigationGraph:
    """
    Navigation graph with explicit edges

    Usage:
        graph = NavigationGraph('floor_plan.geojson')
        path = graph.find_path('a1', 'b5')
        distance = graph.get_distance('a1', 'a2')
    """

    def __init__(self, geojson_path: str):
        self.nodes: Dict[str, NavigationNode] = {}
        self.edges: List[NavigationEdge] = []
        self.adjacency: Dict[str, List[Tuple[str, float]]] = {}  # node_id -> [(neighbor_id, weight)]
        self.weight_matrix: List[List[float]] = []
        self.node_index_map: Dict[str, int] = {}  # node_id -> matrix_index
        self.index_node_map: Dict[int, str] = {}  # matrix_index -> node_id

        self._load_from_geojson(geojson_path)
        self._build_adjacency_list()
        self._build_weight_matrix()

    def _load_from_geojson(self, path: str):
        """Load nodes and edges from GeoJSON file"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Check format version
        properties = data.get('properties', {})
        format_version = properties.get('format_version', '1.0')
        edge_type = properties.get('edge_type', 'unknown')

        if edge_type == 'explicit':
            print(f"✓ Loading explicit edge format (v{format_version})")
        else:
            print(f"⚠ Warning: Unknown edge type '{edge_type}', attempting to parse...")

        # First pass: Load all navigation nodes
        for feature in data['features']:
            props = feature['properties']
            feature_type = props.get('type')

            if feature_type == 'point':  # Navigation node
                node_id = props['id']
                coords = feature['geometry']['coordinates']

                # Create node
                self.nodes[node_id] = NavigationNode(
                    node_id=node_id,
                    position=(coords[0], coords[1]),
                    floor=props.get('floor', 1),
                    rotation=props.get('rotation', '0,1'),
                    index=int(props.get('index', 0)),
                    inct=props.get('inct')
                )

        # Second pass: Load all explicit edges
        for feature in data['features']:
            props = feature['properties']
            feature_type = props.get('type')

            if feature_type == 'edge':  # Explicit navigation edge
                edge_id = props.get('id', f"edge_{len(self.edges)}")
                start_node = props.get('start_node', '')
                end_node = props.get('end_node', '')

                # Skip edges with missing nodes
                if not start_node or not end_node:
                    print(f"⚠ Warning: Edge {edge_id} missing start/end nodes, skipping")
                    continue

                # Skip edges referencing non-existent nodes
                if start_node not in self.nodes or end_node not in self.nodes:
                    print(f"⚠ Warning: Edge {edge_id} references unknown nodes, skipping")
                    continue

                # Create edge
                self.edges.append(NavigationEdge(
                    edge_id=edge_id,
                    start_node=start_node,
                    end_node=end_node,
                    distance=props.get('distance', 0.0),
                    bidirectional=props.get('bidirectional', True),
                    weight=props.get('weight', props.get('distance', 0.0)),
                    floor=props.get('floor', 1)
                ))

        print(f"✓ Loaded {len(self.nodes)} nodes and {len(self.edges)} edges")

    def _build_adjacency_list(self):
        """Build adjacency list from explicit edges"""
        # Initialize adjacency list
        for node_id in self.nodes:
            self.adjacency[node_id] = []

        # Add edges to adjacency list
        for edge in self.edges:
            # Add forward edge
            self.adjacency[edge.start].append((edge.end, edge.weight))

            # Add backward edge if bidirectional
            if edge.bidirectional:
                self.adjacency[edge.end].append((edge.start, edge.weight))

    def _build_weight_matrix(self):
        """Build weight matrix for Floyd-Warshall algorithm"""
        n = len(self.nodes)

        # Create node index mapping
        for idx, node_id in enumerate(sorted(self.nodes.keys())):
            self.node_index_map[node_id] = idx
            self.index_node_map[idx] = node_id

        # Initialize matrix with infinity
        self.weight_matrix = [[float('inf')] * n for _ in range(n)]

        # Set diagonal to 0
        for i in range(n):
            self.weight_matrix[i][i] = 0

        # Fill matrix with explicit edges
        for edge in self.edges:
            start_idx = self.node_index_map[edge.start]
            end_idx = self.node_index_map[edge.end]

            # Set forward edge weight
            self.weight_matrix[start_idx][end_idx] = edge.weight

            # Set backward edge weight if bidirectional
            if edge.bidirectional:
                self.weight_matrix[end_idx][start_idx] = edge.weight

        # Run Floyd-Warshall algorithm
        self._floyd_warshall()

    def _floyd_warshall(self):
        """Floyd-Warshall algorithm for all-pairs shortest path"""
        n = len(self.nodes)

        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if self.weight_matrix[i][k] + self.weight_matrix[k][j] < self.weight_matrix[i][j]:
                        self.weight_matrix[i][j] = self.weight_matrix[i][k] + self.weight_matrix[k][j]

    def get_distance(self, start_id: str, end_id: str) -> float:
        """Get shortest distance between two nodes"""
        if start_id not in self.node_index_map or end_id not in self.node_index_map:
            return float('inf')

        start_idx = self.node_index_map[start_id]
        end_idx = self.node_index_map[end_id]

        return self.weight_matrix[start_idx][end_idx]

    def find_path(self, start_id: str, end_id: str) -> Optional[List[str]]:
        """
        Find shortest path between two nodes using Dijkstra's algorithm

        Returns:
            List of node IDs representing the path, or None if no path exists
        """
        if start_id not in self.nodes or end_id not in self.nodes:
            return None

        if start_id == end_id:
            return [start_id]

        # Dijkstra's algorithm
        unvisited = set(self.nodes.keys())
        distances = {node_id: float('inf') for node_id in self.nodes}
        distances[start_id] = 0
        previous = {node_id: None for node_id in self.nodes}

        while unvisited:
            # Find node with minimum distance
            current = min(unvisited, key=lambda node: distances[node])

            if distances[current] == float('inf'):
                break  # No path to remaining nodes

            if current == end_id:
                break  # Found destination

            unvisited.remove(current)

            # Update distances to neighbors
            for neighbor, weight in self.adjacency[current]:
                if neighbor in unvisited:
                    new_distance = distances[current] + weight
                    if new_distance < distances[neighbor]:
                        distances[neighbor] = new_distance
                        previous[neighbor] = current

        # Reconstruct path
        if distances[end_id] == float('inf'):
            return None  # No path exists

        path = []
        current = end_id
        while current is not None:
            path.insert(0, current)
            current = previous[current]

        return path

    def get_path_instructions(self, path: List[str]) -> List[Dict[str, Any]]:
        """
        Generate turn-by-turn instructions for a path

        Returns:
            List of instruction dictionaries with direction, distance, etc.
        """
        if not path or len(path) < 2:
            return []

        instructions = []
        total_distance = 0

        for i in range(len(path) - 1):
            current_id = path[i]
            next_id = path[i + 1]

            # Find edge between current and next
            edge_distance = None
            for edge in self.edges:
                if (edge.start == current_id and edge.end == next_id) or \
                   (edge.bidirectional and edge.start == next_id and edge.end == current_id):
                    edge_distance = edge.distance
                    break

            if edge_distance is None:
                # Use weight matrix as fallback
                edge_distance = self.get_distance(current_id, next_id)

            total_distance += edge_distance

            instructions.append({
                'from': current_id,
                'to': next_id,
                'distance': edge_distance,
                'cumulative_distance': total_distance,
                'instruction': f"Walk from {current_id} to {next_id} ({edge_distance:.1f}m)"
            })

        return instructions

    def print_graph_info(self):
        """Print graph statistics"""
        print("\n" + "="*50)
        print("Navigation Graph Information")
        print("="*50)
        print(f"Total Nodes: {len(self.nodes)}")
        print(f"Total Edges: {len(self.edges)}")
        print(f"Bidirectional Edges: {sum(1 for e in self.edges if e.bidirectional)}")
        print(f"Unidirectional Edges: {sum(1 for e in self.edges if not e.bidirectional)}")

        # Floor distribution
        floors = {}
        for node in self.nodes.values():
            floors[node.floor] = floors.get(node.floor, 0) + 1

        print(f"\nNodes per floor:")
        for floor in sorted(floors.keys()):
            print(f"  Floor {floor}: {floors[floor]} nodes")

        # Edge statistics
        total_distance = sum(e.distance for e in self.edges)
        avg_distance = total_distance / len(self.edges) if self.edges else 0

        print(f"\nEdge Statistics:")
        print(f"  Total Distance: {total_distance:.2f}m")
        print(f"  Average Edge Length: {avg_distance:.2f}m")
        print("="*50 + "\n")


# Example usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python edge_loader.py <geojson_file>")
        print("Example: python edge_loader.py Library/geojson/floor1.geojson")
        sys.exit(1)

    # Load graph
    graph = NavigationGraph(sys.argv[1])
    graph.print_graph_info()

    # Example: Find path
    if len(sys.argv) >= 4:
        start = sys.argv[2]
        end = sys.argv[3]

        print(f"\nFinding path from {start} to {end}...")
        path = graph.find_path(start, end)

        if path:
            print(f"✓ Path found: {' -> '.join(path)}")
            print(f"  Total distance: {graph.get_distance(start, end):.2f}m")

            print("\nTurn-by-turn instructions:")
            for idx, instruction in enumerate(graph.get_path_instructions(path), 1):
                print(f"  {idx}. {instruction['instruction']}")
        else:
            print(f"✗ No path found between {start} and {end}")
