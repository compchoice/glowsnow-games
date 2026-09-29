import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-4 text-center"
    >
      <div
        aria-hidden
        className="animate-glow-pulse pointer-events-none absolute size-[26rem] -z-10 rounded-full bg-primary/20 blur-[100px]"
      />
      <p className="glow-text text-7xl font-extrabold tracking-tight text-primary sm:text-8xl">
        404
      </p>
      <h1 className="mt-4 text-xl font-semibold">
        This page drifted off with the snow
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The path you followed doesn&apos;t exist. Head back to the arcade floor.
      </p>
      <Link
        to="/"
        className="glow-sm mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        <Gamepad2 className="size-4" />
        Back to the arcade
      </Link>
    </motion.div>
  );
}
