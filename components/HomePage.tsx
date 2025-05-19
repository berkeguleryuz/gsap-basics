"use client";
import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/all";
import { collection } from "@/constants/collection";
import Image from "next/image";
import Link from "next/link";

const IMAGE_COUNT = 25;
const RADIUS = 275;
const CARD_COUNT = 20;

interface CardData {
  index: number;
  angle: number;
  title: string;
  img: string;
}

interface TransformState {
  currentRotation: number;
  targetRotation: number;
  currentX: number;
  targetX: number;
  currentY: number;
  targetY: number;
  currentScale: number;
  targetScale: number;
  angle: number;
}

const HomePage = () => {
  const galleryRef = useRef<HTMLDivElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<HTMLElement | null>(null);
  const [transformState, setTransformState] = useState<TransformState[]>([]);

  const cards: CardData[] = Array.from({ length: IMAGE_COUNT }, (_, i) => {
    const angle = (i / IMAGE_COUNT) * Math.PI * 2;
    const cardIndex = i % CARD_COUNT;
    return {
      index: i,
      angle,
      title: collection[cardIndex].title,
      img: collection[cardIndex].img,
    };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(SplitText);
    }
  }, []);

  useEffect(() => {
    setTransformState(
      cards.map((card) => ({
        currentRotation: 0,
        targetRotation: 0,
        currentX: 0,
        targetX: 0,
        currentY: 0,
        targetY: 0,
        currentScale: 1,
        targetScale: 1,
        angle: card.angle,
      })),
    );
  }, [cards.length]);

  useEffect(() => {
    if (!galleryRef.current) return;
    cards.forEach((card, i) => {
      const el = galleryRef.current?.children[i] as HTMLDivElement;
      if (el) {
        const x = RADIUS * Math.cos(card.angle);
        const y = RADIUS * Math.sin(card.angle);
        gsap.set(el, {
          x,
          y,
          rotation: (card.angle * 180) / Math.PI + 90,
          transformPerspective: 800,
          transformOrigin: "center center",
        });
      }
    });
  }, [cards.length, galleryRef, transformState.length]);

  useEffect(() => {
    if (!galleryRef.current) return;
    const galleryEl = galleryRef.current;
    const sensitivity = 500;
    const effectFalloff = 250;
    const cardMoveAmount = 50;

    function handleMouseMove(e: MouseEvent) {
      if (isPreviewActive || isTransitioning) return;
      const rect = galleryEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setTransformState((prev) =>
        prev.map((state, i) => {
          const cardEl = galleryEl.children[i] as HTMLDivElement;
          if (!cardEl) return state;
          const cardRect = cardEl.getBoundingClientRect();
          const cardCenterX = cardRect.left + cardRect.width / 2 - rect.left;
          const cardCenterY = cardRect.top + cardRect.height / 2 - rect.top;
          const dx = mouseX - cardCenterX;
          const dy = mouseY - cardCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          let flipFactor = 0;
          if (distance < sensitivity) {
            flipFactor = Math.max(0, 1 - distance / effectFalloff);
          }
          return {
            ...state,
            targetRotation: 180 * flipFactor,
            targetScale: 1 + 0.3 * flipFactor,
            targetX: cardMoveAmount * flipFactor * Math.cos(state.angle),
            targetY: cardMoveAmount * flipFactor * Math.sin(state.angle),
          };
        }),
      );
    }
    galleryEl.addEventListener("mousemove", handleMouseMove);
    galleryEl.addEventListener("mouseleave", () => {
      setTransformState((prev) =>
        prev.map((state) => ({
          ...state,
          targetRotation: 0,
          targetScale: 1,
          targetX: 0,
          targetY: 0,
        })),
      );
    });
    return () => {
      galleryEl.removeEventListener("mousemove", handleMouseMove);
      galleryEl.removeEventListener("mouseleave", () => {});
    };
  }, [isPreviewActive, isTransitioning]);

  useEffect(() => {
    if (!galleryRef.current) return;
    let rafId: number;
    function animate() {
      setTransformState((prev) =>
        prev.map((state, i) => {
          const newState = { ...state };
          newState.currentRotation +=
            (newState.targetRotation - newState.currentRotation) * 0.15;
          newState.currentScale +=
            (newState.targetScale - newState.currentScale) * 0.15;
          newState.currentX += (newState.targetX - newState.currentX) * 0.15;
          newState.currentY += (newState.targetY - newState.currentY) * 0.15;
          const cardEl = galleryRef.current?.children[i] as HTMLDivElement;
          if (cardEl) {
            const angle = newState.angle;
            const x = RADIUS * Math.cos(angle);
            const y = RADIUS * Math.sin(angle);
            gsap.set(cardEl, {
              x: x + newState.currentX,
              y: y + newState.currentY,
              rotationY: newState.currentRotation,
              scale: newState.currentScale,
              rotation: (angle * 180) / Math.PI + 90,
              transformPerspective: 1000,
            });
          }
          return newState;
        }),
      );
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [galleryRef]);

  const handleCardClick = (index: number) => {
    if (isPreviewActive || isTransitioning) return;
    setIsPreviewActive(true);
    setIsTransitioning(true);
    if (!galleryRef.current) return;
    const angle = transformState[index]?.angle ?? 0;
    const targetPosition = (Math.PI * 3) / 2;
    let rotationRadians = targetPosition - angle;
    if (rotationRadians > Math.PI) rotationRadians -= Math.PI * 2;
    else if (rotationRadians < -Math.PI) rotationRadians += Math.PI * 2;
    gsap.to(galleryRef.current, {
      scale: 5,
      y: 1300,
      rotation: (rotationRadians * 180) / Math.PI + 360,
      duration: 2,
      ease: "power4.inOut",
      onComplete: () => setIsTransitioning(false),
    });
    if (titleContainerRef.current) {
      titleContainerRef.current.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = cards[index].title;
      titleContainerRef.current.appendChild(p);
      setCurrentTitle(p);
      const splitText = new SplitText(p, {
        type: "words",
        wordsClass: "word",
      });
      const words = splitText.words;
      gsap.set(words, { y: "125% " });
      gsap.to(words, {
        y: "0%",
        duration: 0.75,
        delay: 1.25,
        stagger: 0.1,
        ease: "power4.out",
      });
    }
  };

  const resetGallery = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    if (!galleryRef.current) return;
    gsap.to(galleryRef.current, {
      scale: 1,
      y: 0,
      x: 0,
      rotation: 0,
      duration: 2.5,
      ease: "power4.inOut",
      onComplete: () => {
        setIsPreviewActive(false);
        setIsTransitioning(false);
      },
    });
    if (currentTitle) {
      const words = currentTitle.querySelectorAll(".word");
      gsap.to(words, {
        y: "-125%",
        duration: 0.75,
        delay: 0.5,
        stagger: 0.1,
        ease: "power4.out",
        onComplete: () => {
          if (titleContainerRef.current)
            titleContainerRef.current.innerHTML = "";
          setCurrentTitle(null);
        },
      });
    }
  };

  useEffect(() => {
    function onClick() {
      if (isPreviewActive && !isTransitioning) resetGallery();
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [isPreviewActive, isTransitioning]);

  return (
    <>
      <nav className="absolute left-0 w-screen p-8 flex justify-between items-center z-20 top-0">
        <Link
          href="#berke"
          className="no-underline text-[#1f1f1f] font-['Helvetica Neue',sans-serif] text-[15px] font-semibold leading-none tracking-tight">
          Berke
        </Link>
      </nav>
      <main className="relative w-screen h-[100svh] overflow-hidden">
        <div className="relative w-full h-full flex justify-center items-center [transform-style:preserve-3d] [perspective:2000px] will-change-transform">
          <div
            className="relative w-[600px] h-[600px] flex justify-center items-center [transform-origin:center] will-change-transform"
            ref={galleryRef}>
            {cards.map((card, i) => (
              <div
                className="absolute w-[45px] h-[60px] rounded [transform-origin:center] will-change-transform [transform-style:preserve-3d] [backface-visibility:visible] overflow-hidden cursor-pointer"
                key={card.index}
                data-index={card.index}
                data-title={card.title}
                onClick={() => handleCardClick(i)}>
                <Image
                  src={`/${card.img}`}
                  alt={card.title}
                  className="w-full h-full object-cover [backface-visibility:hidden] [image-rendering:auto]"
                  width={1000}
                  priority
                  height={1000}
                />
              </div>
            ))}
          </div>
          <div
            className="fixed bottom-[25%] left-1/2 translate-x-[-50%] translate-y-1/2 w-full h-[42px] [clip-path:polygon(0_0,100%_0,100%_100%,0%_100%)]"
            ref={titleContainerRef}></div>
        </div>
      </main>
      <footer>Experiment</footer>
    </>
  );
};

export default HomePage;
