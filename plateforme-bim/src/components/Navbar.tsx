"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import UserButton from "@/components/user-button";
import { Button } from "@/components/ui/button";
import { Home, Upload, Cuboid as Cube, Menu, X, ChevronDown, Settings, FileText, Users, Building, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navLinks = [
    { name: "Accueil", href: "/", icon: <Home className="h-4 w-4 mr-2" /> },
    
  ];

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-white shadow"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo et nom */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl hidden sm:inline-block">BIM Platform</span>
            </Link>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}

            <div className="relative group px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
              <div className="flex items-center">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                <span>Projets</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </div>
              <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  <Link href="/projects" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <FileText className="h-4 w-4 inline mr-2" />
                    Tous les projets
                  </Link>
                     
                  <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Users className="h-4 w-4 inline mr-2" />
                    Collaborateurs
                  </Link>
                  <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings className="h-4 w-4 inline mr-2" />
                    Paramètres
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Boutons d'action */}
          <div className="flex items-center space-x-2">
            <UserButton />
            
            {/* Menu mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu principal"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}
            <div className="px-3 py-2 text-sm font-medium text-gray-700">
              <div className="flex items-center">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                <span>Projets</span>
              </div>
            </div>
            <div className="pl-8 space-y-1">
              <Link 
                href="#" 
                className="flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Tous les projets
              </Link>
              <Link 
                href="#" 
                className="flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <Users className="h-4 w-4 mr-2" />
                Collaborateurs
              </Link>
              <Link 
                href="#" 
                className="flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}