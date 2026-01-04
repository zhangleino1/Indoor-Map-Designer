# Migration Guide: Implicit to Explicit Edges (v1.0 → v2.0)

## Overview

This guide explains the migration from implicit edge generation to explicit edge format for indoor navigation.

## What Changed?

### Before (v1.0 - Implicit Edges)

**Problems:**
- ❌ Edges auto-generated based on node ID adjacency (a1→a2, a2→a3)
- ❌ Cannot express cross-corridor connections
- ❌ Cannot handle elevators/stairs properly
- ❌ Fragile: deleting a middle node breaks the chain
- ❌ Limited topology support

**Files:**
- `route.py` - Navigation logic
- `weight.py` - Implicit edge generation based on ID rules
- GeoJSON exports NavNodes only (no edges)

### After (v2.0 - Explicit Edges)

**Advantages:**
- ✅ Edges explicitly defined by visual designer
- ✅ Supports complex topologies (any node to any node)
- ✅ Visual editor is single source of truth
- ✅ Reliable: no dependency on ID naming conventions
- ✅ Easy to debug and validate

**Files:**
- `edge_loader.py` - New graph loader with explicit edges
- `route_v2.py` - Updated navigation using edge_loader
- GeoJSON exports both NavNodes AND edges

## GeoJSON Format Comparison

### Old Format (v1.0)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [100, 200]},
      "properties": {
        "type": "point",
        "id": "a1"
      }
    },
    {
      "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [150, 200]},
      "properties": {
        "type": "point",
        "id": "a2"
      }
    }
  ]
}
```

**Edge generation:** Python infers a1→a2 because IDs are adjacent (1 and 2)

### New Format (v2.0)

```json
{
  "type": "FeatureCollection",
  "properties": {
    "format_version": "2.0",
    "edge_type": "explicit"
  },
  "features": [
    {
      "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [100, 200]},
      "properties": {
        "type": "point",
        "id": "a1",
        "floor": 1
      }
    },
    {
      "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [150, 200]},
      "properties": {
        "type": "point",
        "id": "a2",
        "floor": 1
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[100, 200], [150, 200]]
      },
      "properties": {
        "type": "edge",
        "id": "edge_a1_a2",
        "start_node": "a1",
        "end_node": "a2",
        "distance": 0.5,
        "weight": 0.5,
        "bidirectional": true,
        "floor": 1
      }
    }
  ]
}
```

**Edge definition:** Explicitly declared with start/end nodes

## Migration Steps

### 1. Update Designer Export

The designer now automatically exports edges when you export GeoJSON:

```typescript
// Automatic - no code changes needed
// NavPath elements are exported as type: "edge"
```

### 2. Update Python Code

**Option A: Use new modules (Recommended)**

```python
# Old code
from route import IndoorNavigation

nav = IndoorNavigation('floor1.geojson')
```

```python
# New code
from route_v2 import IndoorNavigation

nav = IndoorNavigation('floor1.geojson')  # Same API!
```

**Option B: Keep old code with backward compatibility**

The old code will still work if you add a fallback:

```python
from edge_loader import NavigationGraph

# Try to load explicit edges
try:
    graph = NavigationGraph('floor1.geojson')
    if len(graph.edges) > 0:
        # Use explicit edges
        print("✓ Using explicit edges")
    else:
        # Fallback to implicit generation
        print("⚠ No explicit edges, using implicit generation")
        # ... old weight.py logic
except Exception as e:
    print(f"⚠ Error loading explicit edges: {e}")
    # Fallback to old method
```

### 3. Test Your Migration

```bash
# Test with new explicit edge loader
python edge_loader.py floor1.geojson

# Test navigation
python route_v2.py floor1.geojson room101 room205

# Compare with old version (if you kept it)
python route.py floor1.geojson room101 room205
```

## API Compatibility

The API remains **100% compatible**:

```python
# Both old and new versions support the same API
nav = IndoorNavigation('floor1.geojson')

# Find route
route = nav.navigate('room101', 'room205')

# Print route
nav.print_route(route)

# Find nearby POIs
nearby = nav.get_nearby_pois('room101', max_distance=50.0)
```

## Key Differences

| Feature | v1.0 (Implicit) | v2.0 (Explicit) |
|---------|-----------------|-----------------|
| Edge source | Auto-generated from IDs | Designer GUI |
| Cross-corridor | ❌ Not possible | ✅ Fully supported |
| Elevators/Stairs | ❌ Hacky workarounds | ✅ Native support |
| ID requirements | ✅ Must follow rules | ⚠️ Optional (recommended) |
| Debugging | ❌ Hard (invisible edges) | ✅ Easy (visible in GUI) |
| Data integrity | ⚠️ Depends on ID rules | ✅ Explicit declaration |

## Example: Complex Topology

### Scenario: Elevator Connection

**v1.0:** Cannot express this - elevator at a5 connects to different corridor b3

**v2.0:** Easy!

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[100, 200], [300, 450]]
  },
  "properties": {
    "type": "edge",
    "id": "elevator_a5_b3",
    "start_node": "a5",
    "end_node": "b3",
    "distance": 0.1,
    "bidirectional": true
  }
}
```

Draw it visually in the designer, export, done! ✅

## Troubleshooting

### "No edges found in GeoJSON"

**Cause:** Using old GeoJSON format (v1.0) without edges

**Solution:**
1. Re-export from updated Indoor Map Designer (v2.0+)
2. Or manually add edges to GeoJSON
3. Or use backward compatibility mode (see above)

### "Edge references unknown node"

**Cause:** NavPath connected to deleted/missing NavNode

**Solution:**
1. Open in designer
2. Check NavPath endpoints
3. Delete orphaned paths or reconnect to valid nodes
4. Re-export

### "Path not found between nodes"

**Cause:** Missing edges (disconnected graph)

**Solution:**
1. Use designer to visualize navigation graph
2. Add missing NavPaths to connect isolated nodes
3. Verify all areas are reachable

## Benefits Summary

✅ **Flexibility:** Connect any node to any other node
✅ **Reliability:** No hidden rules, explicit declarations
✅ **Debugging:** See all edges in visual designer
✅ **Maintainability:** Single source of truth (designer)
✅ **Scalability:** Supports complex multi-floor buildings

## Rollback (If Needed)

If you need to rollback to v1.0:

1. Keep old `route.py` and `weight.py` files
2. Export without edges (manually remove edge features)
3. Use old import: `from route import IndoorNavigation`

But we **strongly recommend** migrating to v2.0 for long-term maintainability!

---

**Questions?** Check `edge_loader.py` and `route_v2.py` source code for detailed implementation.
