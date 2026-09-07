import { useEffect, useState } from "react";
import honeySpriteUrl from "../assets/honey-spritesheet.webp";

type HoneyMascotProps = {
  listening?: boolean;
  motion?: "idle" | "running" | "flying";
  speaking?: boolean;
  size?: "compact" | "header" | "hero";
};

type SpriteAnimation = {
  frames: number;
  row: number;
  speed: number;
};

const sizeMap = {
  compact: { height: 36, width: 33 },
  header: { height: 52, width: 48 },
  hero: { height: 143, width: 132 },
} as const;

export function HoneyMascot({ listening = false, motion = "idle", speaking = false, size = "header" }: HoneyMascotProps) {
  const animation = animationFor(listening, motion, speaking);
  const [frame, setFrame] = useState(0);
  const dimensions = sizeMap[size];

  useEffect(() => {
    setFrame(0);
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % animation.frames), animation.speed);
    return () => window.clearInterval(timer);
  }, [animation.frames, animation.speed]);

  return (
    <span
      aria-label={listening ? "Honey is listening" : speaking ? "Honey is speaking" : motion === "running" ? "Honey is running" : motion === "flying" ? "Honey is flying" : "Honey"}
      className={`honey-mascot honey-mascot--${motion}${listening || speaking ? " honey-mascot--active" : ""}`}
      role="img"
      style={{ height: dimensions.height, width: dimensions.width }}
    >
      <span
        aria-hidden="true"
        className="honey-mascot__sprite"
        style={{
          backgroundImage: `url(${honeySpriteUrl})`,
          backgroundPosition: `${-frame * dimensions.width}px ${-animation.row * dimensions.height}px`,
          backgroundSize: `${dimensions.width * 8}px ${dimensions.height * 11}px`,
        }}
      />
    </span>
  );
}

function animationFor(listening: boolean, motion: HoneyMascotProps["motion"], speaking: boolean): SpriteAnimation {
  if (listening || speaking) return { frames: 8, row: 3, speed: 150 };
  if (motion === "running") return { frames: 8, row: 1, speed: 120 };
  if (motion === "flying") return { frames: 5, row: 4, speed: 150 };
  return { frames: 7, row: 0, speed: 420 };
}
