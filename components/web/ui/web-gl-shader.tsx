"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type WebGLShaderProps = {
  className?: string
}

export const WebGLShader = ({ className }: WebGLShaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const sceneRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    uniforms: {
      time: { value: number }
      resolution: { value: number[] }
      xScale: { value: number }
      yScale: { value: number }
      distortion: { value: number }
    } | null
    animationId: number | null
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  })

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

        float d = length(p) * distortion;

        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return

      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < 768

      refs.renderer.setSize(width, height, false)
      refs.uniforms.resolution.value = [width, height]
      refs.uniforms.xScale.value = isMobile ? 0.72 : 1
      refs.uniforms.yScale.value = isMobile ? 0.68 : 0.5
      refs.uniforms.distortion.value = isMobile ? 0.07 : 0.05
    }

    const initScene = () => {
      refs.scene = new THREE.Scene()
      refs.renderer = new THREE.WebGLRenderer({ canvas })
      refs.renderer.setPixelRatio(window.devicePixelRatio)
      refs.renderer.setClearColor(new THREE.Color(0x000000))

      refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

      refs.uniforms = {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        time: { value: 0 },
        xScale: { value: 1 },
        yScale: { value: 0.5 },
        distortion: { value: 0.05 },
      }

      const positions = new THREE.BufferAttribute(
        new Float32Array([
          -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0,
          0.0,
        ]),
        3,
      )

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", positions)

      const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: refs.uniforms,
        side: THREE.DoubleSide,
      })

      refs.mesh = new THREE.Mesh(geometry, material)
      refs.scene.add(refs.mesh)

      handleResize()
    }

    const animate = () => {
      if (refs.uniforms) refs.uniforms.time.value += 0.01

      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera)
      }

      refs.animationId = requestAnimationFrame(animate)
    }

    initScene()
    animate()

    window.addEventListener("resize", handleResize)

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      window.removeEventListener("resize", handleResize)

      if (refs.mesh) {
        refs.scene?.remove(refs.mesh)
        refs.mesh.geometry.dispose()

        if (refs.mesh.material instanceof THREE.Material) {
          refs.mesh.material.dispose()
        }
      }

      refs.renderer?.dispose()
    }
  }, [])

  return (
    <canvas ref={canvasRef} className={className ?? "absolute left-0 top-0 block h-full w-full"} />
  )
}
