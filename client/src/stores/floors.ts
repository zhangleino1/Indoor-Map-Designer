import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Floor } from '@/types'
import { useElementsStore } from './elements'

export const useFloorsStore = defineStore('floors', () => {
  const floors = ref<Floor[]>([
    { id: 1, name: '1F', visible: true, elements: [] }
  ])

  const sortedFloors = computed(() => {
    return [...floors.value].sort((a, b) => b.id - a.id)
  })

  const floorCount = computed(() => floors.value.length)

  function getFloor(id: number): Floor | undefined {
    return floors.value.find(f => f.id === id)
  }

  function addFloor(name?: string): number {
    const maxId = Math.max(...floors.value.map(f => f.id), 0)
    const newId = maxId + 1
    const newFloor: Floor = {
      id: newId,
      name: name || `${newId}F`,
      visible: true,
      elements: []
    }
    floors.value.push(newFloor)

    // Initialize elements store for this floor
    const elementsStore = useElementsStore()
    elementsStore.initFloor(newId)

    return newId
  }

  function addBasementFloor(name?: string): number {
    const minId = Math.min(...floors.value.map(f => f.id), 0)
    const newId = minId - 1
    const newFloor: Floor = {
      id: newId,
      name: name || `B${Math.abs(newId)}`,
      visible: true,
      elements: []
    }
    floors.value.push(newFloor)

    // Initialize elements store for this floor
    const elementsStore = useElementsStore()
    elementsStore.initFloor(newId)

    return newId
  }

  function removeFloor(id: number) {
    if (floors.value.length <= 1) return false

    const index = floors.value.findIndex(f => f.id === id)
    if (index !== -1) {
      floors.value.splice(index, 1)
      return true
    }
    return false
  }

  function renameFloor(id: number, name: string) {
    const floor = getFloor(id)
    if (floor) {
      floor.name = name
    }
  }

  function toggleFloorVisibility(id: number) {
    const floor = getFloor(id)
    if (floor) {
      floor.visible = !floor.visible
    }
  }

  function duplicateFloor(id: number): number | null {
    const sourceFloor = getFloor(id)
    if (!sourceFloor) return null

    const newId = addFloor(`${sourceFloor.name} (copy)`)

    // Copy elements
    const elementsStore = useElementsStore()
    elementsStore.copyFloorElements(id, newId)

    return newId
  }

  function setFloors(newFloors: Floor[]) {
    floors.value = newFloors
  }

  return {
    floors,
    sortedFloors,
    floorCount,
    getFloor,
    addFloor,
    addBasementFloor,
    removeFloor,
    renameFloor,
    toggleFloorVisibility,
    duplicateFloor,
    setFloors
  }
})
