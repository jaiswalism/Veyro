import { useState } from "react"
import { Users, FileText, CreditCard, BarChart3, Home, Menu, X, LogOut } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

const navigation = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Bills", url: "/bills", icon: FileText },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Reports", url: "/reports", icon: BarChart3 },
]

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const currentPath = location.pathname
  const { signOut } = useAuth()

  const isActive = (path: string) => currentPath === path

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full bg-card border-r border-border transition-all duration-300 lg:relative lg:z-auto flex flex-col",
        collapsed ? "-translate-x-full lg:translate-x-0 lg:w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Veyro</h1>
                <p className="text-xs text-muted-foreground">Bill Smarter</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="lg:hidden"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1">
          {navigation.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              <item.icon className={cn("w-5 h-5", collapsed && !collapsed ? "mr-0" : "")} />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sign out button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="ml-3">Sign Out</span>}
          </Button>
        </div>
      </div>

      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 lg:hidden"
      >
        <Menu className="w-4 h-4" />
      </Button>
    </>
  )
}