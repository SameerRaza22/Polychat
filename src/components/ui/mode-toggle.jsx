"use client"

import * as React from "react"
import {   Sunrise, Sunset } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle(){
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null


    return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      {
        theme === "light" ?( <Sunset className="size-5"/>) : ( <Sunrise className={"size-5"} />
      )}
    </Button>
  );
}