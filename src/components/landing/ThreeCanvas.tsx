"use client";

import { useEffect, useRef, useState } from "react";

export default function ThreeCanvas({ type }: { type: "network" | "truck" | "parcel" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isThreeLoaded, setIsThreeLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already present
    const existingScript = document.querySelector('script[src*="three.min.js"]');
    if (existingScript) {
      if ((window as any).THREE) {
        setIsThreeLoaded(true);
      } else {
        const handleScriptLoad = () => setIsThreeLoaded(true);
        existingScript.addEventListener("load", handleScriptLoad);
        return () => {
          existingScript.removeEventListener("load", handleScriptLoad);
        };
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://ajax.googleapis.com/ajax/libs/threejs/r125/three.min.js";
    script.async = true;
    script.onload = () => setIsThreeLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Keep script loaded so subsequent switches don't re-download it
    };
  }, []);

  useEffect(() => {
    if (!isThreeLoaded || !containerRef.current) return;
    const THREE = (window as any).THREE;
    if (!THREE) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    let animationFrameId: number;

    if (type === "network") {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const nodeGroup = new THREE.Group();
      const nodeCount = 24;
      const nodes: any[] = [];
      const sphereGeom = new THREE.SphereGeometry(0.12, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0x276ef1 });

      for (let i = 0; i < nodeCount; i++) {
        const node = new THREE.Mesh(sphereGeom, sphereMat);
        node.position.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        );
        nodeGroup.add(node);
        nodes.push(node);
      }

      const lineMat = new THREE.LineBasicMaterial({
        color: 0x276ef1,
        transparent: true,
        opacity: 0.18,
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].position.distanceTo(nodes[j].position) < 3.8) {
            const points = [nodes[i].position, nodes[j].position];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeom, lineMat);
            nodeGroup.add(line);
          }
        }
      }

      scene.add(nodeGroup);
      camera.position.z = 6.5;

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        nodeGroup.rotation.y += 0.0015;
        nodeGroup.rotation.x += 0.0008;
        renderer.render(scene, camera);
      };
      animate();

    } else if (type === "truck") {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambientLight);

      const spotLight = new THREE.SpotLight(0x05a357, 1.5);
      spotLight.position.set(8, 12, 10);
      scene.add(spotLight);

      const truckGroup = new THREE.Group();

      const cabGeom = new THREE.BoxGeometry(1.6, 1.1, 1.1);
      const cabMat = new THREE.MeshPhongMaterial({ color: 0x05a357 });
      const cab = new THREE.Mesh(cabGeom, cabMat);
      cab.position.x = 0.8;
      truckGroup.add(cab);

      const bodyGeom = new THREE.BoxGeometry(2.6, 1.4, 1.1);
      const bodyMat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.x = -1.3;
      truckGroup.add(body);

      const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 1.25, 32);
      const wheelMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
      const wheels: any[] = [];

      for (let i = 0; i < 4; i++) {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.y = -0.65;
        wheel.position.x = i < 2 ? 0.8 : -1.8;
        wheel.position.z = i % 2 === 0 ? 0.05 : -0.05;
        truckGroup.add(wheel);
        wheels.push(wheel);
      }

      scene.add(truckGroup);
      camera.position.set(3.5, 2.0, 5.0);
      camera.lookAt(0, 0, 0);

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        truckGroup.position.x = Math.sin(Date.now() * 0.001) * 0.35;
        wheels.forEach((w) => (w.rotation.z += 0.08));
        renderer.render(scene, camera);
      };
      animate();

    } else if (type === "parcel") {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0x276ef1, 1.8);
      pointLight.position.set(6, 6, 6);
      scene.add(pointLight);

      const parcelGroup = new THREE.Group();

      const boxGeom = new THREE.BoxGeometry(1.8, 1.8, 1.8);
      const boxMat = new THREE.MeshPhongMaterial({ color: 0xf5f5f5, shininess: 80 });
      const box = new THREE.Mesh(boxGeom, boxMat);
      parcelGroup.add(box);

      const edges = new THREE.EdgesGeometry(boxGeom);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x276ef1 });
      const line = new THREE.LineSegments(edges, lineMat);
      parcelGroup.add(line);

      const ringGeom = new THREE.TorusGeometry(1.9, 0.04, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x276ef1 });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      parcelGroup.add(ring);

      scene.add(parcelGroup);
      camera.position.z = 5.2;

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        parcelGroup.rotation.y += 0.008;
        parcelGroup.rotation.x += 0.004;
        ring.rotation.z += 0.015;
        renderer.render(scene, camera);
      };
      animate();
    }

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [isThreeLoaded, type]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: "300px" }}
    />
  );
}
