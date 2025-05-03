"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building, Menu, X } from "lucide-react"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isActive = (path: string) => {
    return pathname === path
  }

  const navLinks = [
    { name: "Accueil", href: "/" },
    { name: "Fonctionnalités", href: "#features" },
    { name: "Solutions", href: "#solutions" },
    { name: "Tarifs", href: "#pricing" },
    { name: "Contact", href: "#contact" },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-primary-dark/90 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo et nom */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="transition-transform duration-300 hover:rotate-[360deg]">
                <Building className="h-8 w-8 text-accent" />
              </div>
              <span className="font-bold text-xl hidden sm:inline-block text-white group-hover:text-accent transition-all duration-300">
                BIM Platform
              </span>
            </Link>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href) ? "text-accent" : "text-white/80 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Boutons d'action */}
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" className="text-white hover:text-accent hover:bg-transparent">
              <Link href="/api/auth/signin">Se connecter</Link>
            </Button>

            <Button asChild className="bg-accent hover:bg-accent/90 text-white hidden md:flex">
              <Link href="/api/auth/signin">S'inscrire</Link>
            </Button>

            {/* Menu mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-accent hover:bg-transparent"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu principal"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden bg-primary-dark border-t border-accent/10">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-2 text-lg ${
                  isActive(link.href) ? "text-accent" : "text-white/80 hover:text-white"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <Button asChild className="bg-accent hover:bg-accent/90 text-white w-full mt-4">
              <Link href="/api/auth/signin">S'inscrire</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
