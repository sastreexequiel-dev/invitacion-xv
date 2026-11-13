"use client";
import { motion } from "framer-motion";

/** Aparición progresiva al entrar en pantalla */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
