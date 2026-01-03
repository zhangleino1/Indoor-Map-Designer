import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Data directory
const DATA_DIR = path.join(__dirname, '../../data/projects')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Initialize
ensureDataDir()

// Project interface
interface Project {
  id: string
  name: string
  description?: string
  scale: number
  unit: string
  floors: any[]
  elements: Record<number, any[]>
  createdAt: string
  updatedAt: string
}

// List all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureDataDir()
    const files = await fs.readdir(DATA_DIR)
    const projects: Partial<Project>[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8')
          const project = JSON.parse(content) as Project
          // Return only metadata
          projects.push({
            id: project.id,
            name: project.name,
            description: project.description,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
          })
        } catch (e) {
          console.error(`Error reading project file ${file}:`, e)
        }
      }
    }

    res.json(projects)
  } catch (error) {
    console.error('Error listing projects:', error)
    res.status(500).json({ error: 'Failed to list projects' })
  }
})

// Get single project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const filePath = path.join(DATA_DIR, `${id}.json`)

    const content = await fs.readFile(filePath, 'utf-8')
    const project = JSON.parse(content)

    res.json(project)
  } catch (error) {
    console.error('Error getting project:', error)
    res.status(404).json({ error: 'Project not found' })
  }
})

// Create new project
router.post('/', async (req: Request, res: Response) => {
  try {
    await ensureDataDir()

    const project: Project = {
      id: uuidv4(),
      name: req.body.name || 'Untitled Project',
      description: req.body.description,
      scale: req.body.scale || 1,
      unit: req.body.unit || 'cm',
      floors: req.body.floors || [{ id: 1, name: '1F', visible: true }],
      elements: req.body.elements || { 1: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const filePath = path.join(DATA_DIR, `${project.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(project, null, 2))

    res.status(201).json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const filePath = path.join(DATA_DIR, `${id}.json`)

    // Check if exists
    try {
      await fs.access(filePath)
    } catch {
      return res.status(404).json({ error: 'Project not found' })
    }

    const existingContent = await fs.readFile(filePath, 'utf-8')
    const existingProject = JSON.parse(existingContent) as Project

    const updatedProject: Project = {
      ...existingProject,
      ...req.body,
      id, // Ensure ID doesn't change
      createdAt: existingProject.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString()
    }

    await fs.writeFile(filePath, JSON.stringify(updatedProject, null, 2))

    res.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const filePath = path.join(DATA_DIR, `${id}.json`)

    await fs.unlink(filePath)

    res.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(404).json({ error: 'Project not found' })
  }
})

// Export project as GeoJSON
router.get('/:id/export/geojson', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const filePath = path.join(DATA_DIR, `${id}.json`)

    const content = await fs.readFile(filePath, 'utf-8')
    const project = JSON.parse(content) as Project

    // Convert to GeoJSON format
    const features: any[] = []

    for (const floorId in project.elements) {
      for (const element of project.elements[floorId]) {
        features.push(convertElementToFeature(element))
      }
    }

    const geojson = {
      type: 'FeatureCollection',
      properties: {
        name: project.name,
        scale: project.scale,
        unit: project.unit
      },
      features
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}.geojson"`)
    res.json(geojson)
  } catch (error) {
    console.error('Error exporting project:', error)
    res.status(500).json({ error: 'Failed to export project' })
  }
})

// Helper function to convert element to GeoJSON feature
function convertElementToFeature(element: any): any {
  let geometry: any

  switch (element.type) {
    case 'wall':
    case 'navpath':
      geometry = {
        type: 'LineString',
        coordinates: element.points.map((p: any) => [p.x, p.y])
      }
      break
    case 'room':
      const coords = element.points.map((p: any) => [p.x, p.y])
      // Ensure polygon is closed
      if (coords.length > 0) {
        const first = coords[0]
        const last = coords[coords.length - 1]
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([...first])
        }
      }
      geometry = {
        type: 'Polygon',
        coordinates: [coords]
      }
      break
    case 'door':
    case 'window':
    case 'poi':
      geometry = {
        type: 'Point',
        coordinates: [element.position.x, element.position.y]
      }
      break
    default:
      geometry = { type: 'Point', coordinates: [0, 0] }
  }

  return {
    type: 'Feature',
    geometry,
    properties: {
      id: element.id,
      type: element.type,
      floor: element.floor,
      name: element.name,
      ...getTypeSpecificProperties(element)
    }
  }
}

function getTypeSpecificProperties(element: any): Record<string, any> {
  const props: Record<string, any> = {}

  switch (element.type) {
    case 'wall':
      props.thickness = element.thickness
      break
    case 'room':
      props.area = element.area
      break
    case 'door':
    case 'window':
      props.width = element.width
      props.rotation = element.rotation
      break
    case 'poi':
      props.poiType = element.poiType
      props.description = element.description
      props.connectsTo = element.connectsTo
      break
    case 'navpath':
      props.bidirectional = element.bidirectional
      break
  }

  return props
}

export { router as projectsRouter }
