"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, Color, SRGBColorSpace, type MeshStandardMaterial } from "three";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { chairPositions, STATE_COLORS, tableSize } from "@/lib/floor";
import type { DiningTable } from "@/lib/types";
import type { FloorViewProps } from "./floor-2d";

const TABLE_HEIGHT = 0.75;
const WALL_HEIGHT = 2.6;

function Chair({ x, y, angle }: { x: number; y: number; angle: number }) {
  // Le dossier est placé côté extérieur de la table.
  return (
    <group position={[x, 0, y]} rotation={[0, Math.PI / 2 - angle, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>
      <mesh position={[0, 0.7, 0.18]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.04]} />
        <meshStandardMaterial color="#854d0e" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.44]} />
        <meshStandardMaterial color="#44403c" />
      </mesh>
    </group>
  );
}

/** Étiquette toujours face caméra, dessinée dans une texture (pas de DOM). */
function Label({
  position,
  title,
  subtitle,
  color,
  selected,
}: {
  position: [number, number, number];
  title: string;
  subtitle: string;
  color: string;
  selected: boolean;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 112;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 104, 18);
    ctx.fill();
    if (selected) {
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#1c1917";
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText(title, 128, 50, 232);
    ctx.font = "32px system-ui, sans-serif";
    ctx.fillText(subtitle, 128, 92, 232);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [title, subtitle, color, selected]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[0.9, 0.39, 1]}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}

function Table3D({
  table,
  color,
  selected,
  label,
  onClick,
}: {
  table: DiningTable;
  color: string;
  selected: boolean;
  label: string;
  onClick?: (shiftKey: boolean) => void;
}) {
  const { w, d } = tableSize(table);
  // La couleur du plateau glisse vers celle de son nouvel état au lieu de changer d'un coup.
  const material = useRef<MeshStandardMaterial>(null);
  const [initialColor] = useState(color);
  const targetColor = useMemo(() => new Color(color), [color]);
  useFrame((_, delta) => material.current?.color.lerp(targetColor, 1 - Math.exp(-delta * 5)));

  return (
    <group
      position={[table.x, 0, table.y]}
      rotation={[0, (-table.rotation * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e.nativeEvent.shiftKey);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = onClick ? "pointer" : "";
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {/* Plateau */}
      <mesh position={[0, TABLE_HEIGHT, 0]} castShadow receiveShadow>
        {table.shape === "round" ? (
          <cylinderGeometry args={[w / 2, w / 2, 0.05, 40]} />
        ) : (
          <boxGeometry args={[w, 0.05, d]} />
        )}
        <meshStandardMaterial
          ref={material}
          color={initialColor}
          emissive={selected ? "#ffffff" : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
          roughness={0.5}
        />
      </mesh>
      {/* Pied central */}
      <mesh position={[0, TABLE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, TABLE_HEIGHT]} />
        <meshStandardMaterial color="#292524" />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 24]} />
        <meshStandardMaterial color="#292524" />
      </mesh>

      {chairPositions(table).map((c, i) => (
        <Chair key={i} {...c} />
      ))}

      <Label position={[0, TABLE_HEIGHT + 0.5, 0]} title={table.label} subtitle={label} color={color} selected={selected} />
    </group>
  );
}

export default function Floor3D({ room, tables, states, selectedIds = [], onSelectTable, autoRotate = false }: FloorViewProps) {
  const [rotating, setRotating] = useState(autoRotate);
  const size = Math.max(room.width, room.depth);

  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-gradient-to-b from-stone-200 to-stone-100">
      <Canvas shadows="percentage" camera={{ position: [0, size * 0.9, size * 0.95], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[size * 0.4, size, size * 0.3]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-size}
          shadow-camera-right={size}
          shadow-camera-top={size}
          shadow-camera-bottom={-size}
        />

        {/* La salle est centrée sur l'origine */}
        <group position={[-room.width / 2, 0, -room.depth / 2]}>
          {/* Sol */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[room.width / 2, 0, room.depth / 2]} receiveShadow>
            <planeGeometry args={[room.width, room.depth]} />
            <meshStandardMaterial color="#d6c4a8" roughness={0.9} />
          </mesh>
          {/* Murs du fond et de gauche (vue en coupe) */}
          <mesh position={[room.width / 2, WALL_HEIGHT / 2, -0.05]} receiveShadow>
            <boxGeometry args={[room.width, WALL_HEIGHT, 0.1]} />
            <meshStandardMaterial color="#f5f5f4" />
          </mesh>
          <mesh position={[-0.05, WALL_HEIGHT / 2, room.depth / 2]} receiveShadow>
            <boxGeometry args={[0.1, WALL_HEIGHT, room.depth]} />
            <meshStandardMaterial color="#e7e5e4" />
          </mesh>

          {tables.map((t) => {
            const st = states?.get(t.id);
            const color = st ? STATE_COLORS[st.state] : states ? STATE_COLORS.free : "#a8a29e";
            return (
              <Table3D
                key={t.id}
                table={t}
                color={color}
                selected={selectedIds.includes(t.id)}
                label={st?.label ?? `${t.seats} pl.`}
                onClick={onSelectTable ? (shiftKey) => onSelectTable(t.id, { shiftKey }) : undefined}
              />
            );
          })}
        </group>

        <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={size * 1.5} blur={2} far={2} />
        <OrbitControls
          makeDefault
          autoRotate={rotating}
          autoRotateSpeed={0.6}
          enableDamping
          onStart={() => setRotating(false)}
          target={[0, 0.5, 0]}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={3}
          maxDistance={size * 2.5}
        />
      </Canvas>
    </div>
  );
}
