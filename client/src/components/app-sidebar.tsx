import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  ShoppingCart,
  Package,
  Wheat,
  MapPin,
  Factory,
  LayoutDashboard,
  Image,
  FileText,
  LogOut,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Dashboard",
    url: "/bakehouse",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    url: "/bakehouse/orders",
    icon: ShoppingCart,
  },
  {
    title: "Invoices",
    url: "/bakehouse/invoices",
    icon: FileText,
  },
  {
    title: "Production",
    url: "/bakehouse/production",
    icon: Factory,
  },
  {
    title: "Products",
    url: "/bakehouse/products",
    icon: Package,
  },
  {
    title: "Ingredients",
    url: "/bakehouse/ingredients",
    icon: Wheat,
  },
  {
    title: "Locations",
    url: "/bakehouse/locations",
    icon: MapPin,
  },
  {
    title: "Marketing",
    url: "/bakehouse/marketing",
    icon: Image,
  },
  {
    title: "Analytics",
    url: "/bakehouse/analytics",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/bakehouse" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
            <span className="font-serif text-lg font-bold text-sidebar">D</span>
          </div>
          <span className="font-serif text-xl tracking-wide text-gold">Bakehouse</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url !== "/bakehouse" && location.startsWith(item.url))}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.username || user.firstName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Baker</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
