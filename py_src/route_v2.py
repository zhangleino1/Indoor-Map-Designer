"""
Indoor Navigation with Explicit Edges (Version 2.0)
===================================================

This is the updated navigation module that uses explicit edges from the
Indoor Map Designer instead of implicit edge generation.

Migration from v1.0:
- Old version (route.py + weight.py): Used implicit edge generation based on node ID adjacency
- New version (route_v2.py + edge_loader.py): Uses explicit edges from designer

Advantages:
- Supports complex topologies (cross-corridor, elevators, stairs)
- Visual editor is single source of truth
- No dependency on node ID naming rules
- More reliable and maintainable

Author: Indoor Map Designer
Version: 2.0
"""

import json
from typing import Dict, List, Tuple, Optional
from edge_loader import NavigationGraph, NavigationNode


class IndoorNavigation:
    """
    Main navigation class for indoor pathfinding

    Usage:
        nav = IndoorNavigation('floor1.geojson')
        route = nav.navigate('room101', 'room205')
        nav.print_route(route)
    """

    def __init__(self, geojson_file: str):
        """
        Initialize navigation system

        Args:
            geojson_file: Path to GeoJSON file exported from Indoor Map Designer
        """
        self.graph = NavigationGraph(geojson_file)
        self.pois = {}  # POI_id -> {name, position, access_node}
        self.rooms = {}  # room_id -> {name, doors, door_vertices}

        self._load_pois_and_rooms(geojson_file)

    def _load_pois_and_rooms(self, geojson_file: str):
        """Load POIs and rooms for navigation endpoints"""
        with open(geojson_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for feature in data['features']:
            props = feature['properties']
            feature_type = props.get('type')

            # Load POIs (elevators, stairs, toilets, etc.)
            if feature_type in ['elevator', 'stair', 'men_toilet', 'women_toilet', 'poi']:
                poi_id = props['id']

                # Extract access node (closest NavNode)
                vertex_id = props.get('vertex_id', '')
                access_nodes = vertex_id.split(';') if vertex_id else []

                self.pois[poi_id] = {
                    'name': props.get('name', poi_id),
                    'type': feature_type,
                    'floor': props.get('floor', 1),
                    'access_nodes': access_nodes  # NavNode IDs for access
                }

            # Load rooms
            elif feature_type == 'room':
                room_id = props['id']

                vertex_id = props.get('vertex_id', '')
                access_nodes = vertex_id.split(';') if vertex_id else []

                self.rooms[room_id] = {
                    'name': props.get('name', room_id),
                    'floor': props.get('floor', 1),
                    'access_nodes': access_nodes
                }

    def navigate(self, start: str, end: str) -> Optional[Dict]:
        """
        Navigate from start to end location

        Args:
            start: Starting location (room ID, POI ID, or NavNode ID)
            end: Ending location (room ID, POI ID, or NavNode ID)

        Returns:
            Dictionary with path, distance, and instructions, or None if no path
        """
        # Resolve start and end to NavNode IDs
        start_node = self._resolve_location(start)
        end_node = self._resolve_location(end)

        if not start_node or not end_node:
            print(f"✗ Error: Could not resolve locations")
            if not start_node:
                print(f"  Start location '{start}' not found")
            if not end_node:
                print(f"  End location '{end}' not found")
            return None

        # Find path
        path = self.graph.find_path(start_node, end_node)

        if not path:
            return None

        # Get distance
        distance = self.graph.get_distance(start_node, end_node)

        # Generate instructions
        instructions = self.graph.get_path_instructions(path)

        return {
            'start': start,
            'end': end,
            'start_node': start_node,
            'end_node': end_node,
            'path': path,
            'distance': distance,
            'instructions': instructions,
            'num_steps': len(instructions)
        }

    def _resolve_location(self, location: str) -> Optional[str]:
        """
        Resolve a location (room/POI/node) to a NavNode ID

        Args:
            location: Location identifier (room ID, POI ID, or NavNode ID)

        Returns:
            NavNode ID, or None if not found
        """
        # Check if it's already a NavNode
        if location in self.graph.nodes:
            return location

        # Check if it's a POI
        if location in self.pois:
            access_nodes = self.pois[location]['access_nodes']
            if access_nodes:
                return access_nodes[0]  # Use first access node

        # Check if it's a room
        if location in self.rooms:
            access_nodes = self.rooms[location]['access_nodes']
            if access_nodes:
                return access_nodes[0]  # Use first access node

        return None

    def print_route(self, route: Dict):
        """Print route information in a user-friendly format"""
        if not route:
            print("✗ No route available")
            return

        print("\n" + "="*60)
        print(f"Route: {route['start']} → {route['end']}")
        print("="*60)
        print(f"Total Distance: {route['distance']:.1f}m")
        print(f"Number of Steps: {route['num_steps']}")
        print(f"Path: {' → '.join(route['path'])}")
        print("\nTurn-by-turn Instructions:")
        print("-"*60)

        for idx, instruction in enumerate(route['instructions'], 1):
            print(f"{idx:2d}. {instruction['instruction']}")
            print(f"    Cumulative: {instruction['cumulative_distance']:.1f}m")

        print("="*60 + "\n")

    def get_nearby_pois(self, location: str, max_distance: float = 50.0) -> List[Dict]:
        """
        Find POIs within max_distance from location

        Args:
            location: Starting location
            max_distance: Maximum distance in meters

        Returns:
            List of nearby POIs with distance information
        """
        start_node = self._resolve_location(location)
        if not start_node:
            return []

        nearby = []

        for poi_id, poi_info in self.pois.items():
            poi_node = self._resolve_location(poi_id)
            if poi_node:
                distance = self.graph.get_distance(start_node, poi_node)
                if distance <= max_distance:
                    nearby.append({
                        'id': poi_id,
                        'name': poi_info['name'],
                        'type': poi_info['type'],
                        'distance': distance
                    })

        # Sort by distance
        nearby.sort(key=lambda x: x['distance'])
        return nearby


# Example usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python route_v2.py <geojson_file> [start] [end]")
        print("Example: python route_v2.py floor1.geojson room101 room205")
        sys.exit(1)

    # Initialize navigation
    nav = IndoorNavigation(sys.argv[1])

    print("\n📍 Indoor Navigation System (v2.0 - Explicit Edges)")
    nav.graph.print_graph_info()

    # If start and end provided, find route
    if len(sys.argv) >= 4:
        start = sys.argv[2]
        end = sys.argv[3]

        print(f"\n🔍 Finding route: {start} → {end}")
        route = nav.navigate(start, end)

        if route:
            nav.print_route(route)

            # Show nearby POIs at destination
            print("\n🏢 Nearby POIs at destination:")
            nearby = nav.get_nearby_pois(end, max_distance=30.0)
            for poi in nearby[:5]:  # Show top 5
                print(f"  • {poi['name']} ({poi['type']}) - {poi['distance']:.1f}m")
        else:
            print(f"\n✗ No route found between {start} and {end}")

    # Interactive mode
    else:
        print("\n💡 Tip: Provide start and end locations as arguments")
        print("   Example: python route_v2.py floor1.geojson a1 b5")
