"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Cloud, ArrowRight, Type, MessageSquare } from "lucide-react"
import * as THREE from "three"
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer"

interface BaseAnnotation {
  text: string
  date: Date
  viewpoint: {
    position: [number, number, number]
    target: [number, number, number]
    up: [number, number, number]
  }
}

interface CloudAnnotation extends BaseAnnotation {
  type: "cloud"
  position: THREE.Vector3
  size?: number
  segments?: number
}

interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow"
  start?: THREE.Vector3
  end?: THREE.Vector3
  position: THREE.Vector3
  headSize?: number
}

interface TextAnnotation extends BaseAnnotation {
  type: "text"
  position: THREE.Vector3
}

export type Comment = (CloudAnnotation | ArrowAnnotation | TextAnnotation) & { id: string; author: string }

interface AnnotationTypeButtonProps {
  type: "cloud" | "arrow" | "text"
  label: string
  icon: React.ReactNode
  selected: string
  onSelect: (type: "cloud" | "arrow" | "text") => void
}

export function AnnotationTypeButton({ type, label, icon, selected, onSelect }: AnnotationTypeButtonProps) {
  return (
    <Button
      variant={selected === type ? "default" : "outline"}
      className={`h-24 flex flex-col gap-2 ${selected === type ? "border-2 border-blue-500" : ""}`}
      onClick={() => onSelect(type)}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  )
}

interface CommentPanelProps {
  isActive: boolean
  selectedAnnotationType: "cloud" | "arrow" | "text"
  setSelectedAnnotationType: (type: "cloud" | "arrow" | "text") => void
  commentText: string
  setCommentText: (text: string) => void
  commentPosition: THREE.Vector3 | null
  setCommentPosition: (position: THREE.Vector3 | null) => void
  onSubmit: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export function CommentPanel({
  isActive,
  selectedAnnotationType,
  setSelectedAnnotationType,
  commentText,
  setCommentText,
  commentPosition,
  setCommentPosition,
  onSubmit,
}: CommentPanelProps) {
  if (!isActive) return null

  return (
    <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg w-96">
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Create Annotation</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <AnnotationTypeButton
            type="cloud"
            label="Cloud"
            icon={<Cloud className="h-4 w-4" />}
            selected={selectedAnnotationType}
            onSelect={setSelectedAnnotationType}
          />
          <AnnotationTypeButton
            type="arrow"
            label="Arrow"
            icon={<ArrowRight className="h-4 w-4" />}
            selected={selectedAnnotationType}
            onSelect={setSelectedAnnotationType}
          />
          <AnnotationTypeButton
            type="text"
            label="Text"
            icon={<Type className="h-4 w-4" />}
            selected={selectedAnnotationType}
            onSelect={setSelectedAnnotationType}
          />
        </div>

        {/* Show text field only for text annotations */}
        {selectedAnnotationType === "text" && (
          <textarea
            placeholder="Add comment..."
            className="w-full p-2 border rounded-md mb-3"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        )}

        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-gray-500">
            {commentPosition
              ? `Position: ${commentPosition.x?.toFixed(2)}, ${commentPosition.y?.toFixed(2)}, ${commentPosition.z?.toFixed(2)}`
              : "Click on model to place marker"}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCommentPosition(null)}>
            Reposition
          </Button>
        </div>

        {/* Show submit button only if position is defined */}
        {commentPosition && (
          <Button className="w-full" onClick={onSubmit}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {selectedAnnotationType === "cloud" ? "Place Cloud" : "Create Annotation"}
          </Button>
        )}
      </div>
    </div>
  )
}

interface AnnotationSystemProps {
  viewerRef: React.RefObject<any>
  containerRef: React.RefObject<HTMLDivElement>
  activeTool: string
  camera?: THREE.Camera
  controls?: any
  user?: { name: string; id: string }
}

export function AnnotationSystem({ viewerRef, containerRef, activeTool, camera, controls, user }: AnnotationSystemProps) {
  const [selectedAnnotationType, setSelectedAnnotationType] = useState<"cloud" | "arrow" | "text">("cloud")
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState<string>("")
  const [commentPosition, setCommentPosition] = useState<THREE.Vector3 | null>(null)
  
  // Handle clicking on the model to place annotations
  useEffect(() => {
    if (!viewerRef.current || activeTool !== "comment") return
    
    const container = containerRef.current
    if (!container) return
    
    const handleClick = (event: MouseEvent) => {
      const viewer = viewerRef.current
      if (!viewer) return
      
      const rect = container.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )
      
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, viewer.context.getCamera())
      
      // Get IFC meshes
      const ifcMeshes = viewer.IFC.loader.ifcManager.state.models
        .filter((model: any) => model.mesh)
        .map((model: any) => model.mesh)
      
      const intersects = raycaster.intersectObjects(ifcMeshes, true)
      
      if (intersects.length > 0) {
        const intersection = intersects[0]
        setCommentPosition(intersection.point)
      } else {
        setCommentPosition(null)
      }
    }
    
    container.addEventListener("click", handleClick)
    return () => {
      container.removeEventListener("click", handleClick)
    }
  }, [activeTool, viewerRef, containerRef])
  
  // Create and show preview marker when a position is selected
  useEffect(() => {
    if (!viewerRef.current || !commentPosition) return

    const viewer = viewerRef.current
    const scene = viewer.context.getScene()

    let marker: THREE.Object3D | null = null

    // Create visual marker based on annotation type
    switch (selectedAnnotationType) {
      case "cloud":
        // Cloud marker (group of spheres)
        const cloudGroup = new THREE.Group()
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          const sphereGeometry = new THREE.SphereGeometry(0.15)
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x4287f5, transparent: true, opacity: 0.6 })
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
          sphere.position.set(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0)
          cloudGroup.add(sphere)
        }
        marker = cloudGroup
        break

      case "arrow":
        // Arrow marker
        const arrowDirection = new THREE.Vector3(1, 0, 0) // Default direction
        const arrowHelper = new THREE.ArrowHelper(arrowDirection, new THREE.Vector3(0, 0, 0), 1, 0xff0000)
        marker = arrowHelper
        break

      case "text":
        // Text marker (sphere with CSS2D label)
        const textDiv = document.createElement("div")
        const textLabel = new CSS2DObject(textDiv)
        textLabel.position.set(0, 0.5, 0) // Vertical offset

        const sphereGeometry = new THREE.SphereGeometry(0.15)
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x4287f5 })
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

        const textGroup = new THREE.Group()
        textGroup.add(sphere)
        textGroup.add(textLabel)
        marker = textGroup
        break

      default:
        // Default marker (red sphere)
        const defaultGeometry = new THREE.SphereGeometry(0.1)
        const defaultMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        marker = new THREE.Mesh(defaultGeometry, defaultMaterial)
        break
    }

    // Position the marker
    if (marker) {
      marker.position.copy(commentPosition)
      scene.add(marker)
    }

    // Clean up marker on unmount
    return () => {
      if (marker) {
        scene.remove(marker)
      }
    }
  }, [commentPosition, selectedAnnotationType, viewerRef])
  
  // Create annotation objects
  const createAnnotationObject = (comment: Comment) => {
    const group = new THREE.Group()

    // Create marker based on type
    let marker: THREE.Object3D

    switch (comment.type) {
      case "cloud":
        marker = createCloudMarker()
        break
      case "arrow":
        marker = createArrowMarker()
        break
      case "text":
        marker = createTextMarker()
        break
      default:
        marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.1),
          new THREE.MeshBasicMaterial({ color: 0x4287f5 })
        )
    }

    // Add marker to group
    group.add(marker)

    // Create label
    const labelDiv = document.createElement("div")
    labelDiv.className = "annotation-label"
    labelDiv.textContent = comment.text

    const label = new CSS2DObject(labelDiv)
    label.position.set(0, 0.2, 0) // Offset above marker

    group.add(label)

    // Position the entire group
    group.position.copy(comment.position)

    return group
  }

  const createCloudMarker = () => {
    // Create cloud shape with curves
    const shape = new THREE.Shape()
    const points = []
    const radius = 0.3
    const numPoints = 12

    // Generate random points around a circle
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const variance = radius * 0.3 * Math.random()
      points.push(
        new THREE.Vector2(
          Math.cos(angle) * (radius + variance),
          Math.sin(angle) * (radius + variance)
        )
      )
    }

    // Smooth the shape with curves
    shape.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const p = points[i]
      shape.quadraticCurveTo(p.x, p.y, p.x, p.y)
    }
    shape.closePath()

    // Extrude the shape
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
      curveSegments: 32
    })

    return new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0x4287f5,
        transparent: true,
        opacity: 0.8
      })
    )
  }

  const createArrowMarker = () => {
    const direction = new THREE.Vector3(0, 1, 0)
    return new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(),
      1,
      0xff0000,
      0.2,
      0.1
    )
  }

  const createTextMarker = () => {
    const geometry = new THREE.CircleGeometry(0.1, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0x4287f5,
      side: THREE.DoubleSide
    })
    return new THREE.Mesh(geometry, material)
  }
  
  // Handle annotation submission
  const handleCommentSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (!viewerRef.current?.context || !commentPosition || !camera) {
      console.error("Missing required data for annotation")
      return
    }

    // Verify commentPosition is a THREE.Vector3 instance
    if (!(commentPosition instanceof THREE.Vector3)) {
      console.error("commentPosition is not a valid THREE.Vector3")
      return
    }

    const target = new THREE.Vector3()
    controls?.getTarget(target)

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      type: selectedAnnotationType,
      text: selectedAnnotationType === "cloud" ? "" : commentText, // Text optional for clouds
      author: user?.name || "Unknown User",
      date: new Date(),
      position: commentPosition.clone(),
      viewpoint: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
        up: [camera.up.x, camera.up.y, camera.up.z],
      },
    }

    // Create 3D annotation object
    const annotationObject = createAnnotationObject(newComment)

    // Add object to scene
    viewerRef.current.context.getScene().add(annotationObject)

    // Update state
    setComments((prev) => [...prev, newComment])
    setCommentText("") // Reset comment text
    setCommentPosition(null) // Reset position
  }
  
  // Load user annotations
  useEffect(() => {
    const loadUserAnnotations = async () => {
      if (!user) return

      try {
        const response = await fetch(`/api/annotations?userId=${user.id}`)
        const annotations = await response.json()
        setComments(annotations)

        // Add 3D objects to scene
        annotations.forEach((comment: Comment) => {
          const obj = createAnnotationObject(comment)
          viewerRef.current?.context.getScene().add(obj)
        })
      } catch (error) {
        console.error("Error loading annotations", error)
      }
    }
    
    loadUserAnnotations()
  }, [user, viewerRef])
  
  return (
    <CommentPanel
      isActive={activeTool === "comment"}
      selectedAnnotationType={selectedAnnotationType}
      setSelectedAnnotationType={setSelectedAnnotationType}
      commentText={commentText}
      setCommentText={setCommentText}
      commentPosition={commentPosition}
      setCommentPosition={setCommentPosition}
      onSubmit={handleCommentSubmit}
    />
  )
}