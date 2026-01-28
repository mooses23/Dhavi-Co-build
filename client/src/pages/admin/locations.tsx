import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Plus, Pencil, Store, Truck, Building, Home } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import type { Location } from "@shared/schema";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const createGoldMarkerIcon = () => {
  return L.divIcon({
    className: 'gold-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        position: relative;
      ">
        <div style="
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #d4a017 0%, #f0c040 50%, #c69214 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 0 12px rgba(212, 160, 23, 0.6), 0 3px 8px rgba(0,0,0,0.4);
          border: 2px solid rgba(255,255,255,0.4);
        "></div>
        <div style="
          width: 10px;
          height: 10px;
          background: rgba(255,255,255,0.95);
          border-radius: 50%;
          position: absolute;
          top: 7px;
          left: 9px;
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const NYC_CENTER: [number, number] = [40.7128, -74.0060];
const DEFAULT_ZOOM = 11;

const locationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  address: z.string().optional(),
  latitude: z.union([z.number(), z.string().transform(v => v === "" ? null : parseFloat(v))]).nullable().optional(),
  longitude: z.union([z.number(), z.string().transform(v => v === "" ? null : parseFloat(v))]).nullable().optional(),
  isActive: z.boolean().default(true),
});

type LocationFormData = z.infer<typeof locationFormSchema>;

const locationTypes = [
  { value: "basement", label: "Basement", icon: Home },
  { value: "popup", label: "Pop-up", icon: Store },
  { value: "wholesale", label: "Wholesale", icon: Building },
  { value: "delivery", label: "Delivery", icon: Truck },
];

function MapController({ center, zoom }: { center: [number, number] | null; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 0.5 });
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function AdminLocations() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const isDarkMode = useMemo(() => {
    if (theme === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    }
    return theme === "dark";
  }, [theme]);

  const goldMarkerIcon = useMemo(() => createGoldMarkerIcon(), []);

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ["/api/admin/locations"],
  });

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      type: "",
      address: "",
      latitude: null,
      longitude: null,
      isActive: true,
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const payload = {
        ...data,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      };
      if (editingLocation) {
        return await apiRequest("PATCH", `/api/admin/locations/${editingLocation.id}`, payload);
      }
      return await apiRequest("POST", "/api/admin/locations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations"] });
      toast({ title: editingLocation ? "Location Updated" : "Location Added" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    form.reset();
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    form.reset({
      name: location.name,
      type: location.type,
      address: location.address || "",
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      isActive: location.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: LocationFormData) => {
    createLocationMutation.mutate(data);
  };

  const getTypeIcon = (type: string) => {
    const config = locationTypes.find((t) => t.value === type);
    return config?.icon || MapPin;
  };

  const handleLocationCardClick = (location: Location) => {
    if (location.latitude && location.longitude) {
      setMapCenter([location.latitude, location.longitude]);
    }
  };

  const locationsWithCoords = locations?.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground mt-1">Manage pickup and distribution points</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-location">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="modern-map-container h-[350px] rounded-lg overflow-hidden relative">
            <MapContainer
              center={NYC_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              className="modern-leaflet-map"
              data-testid="locations-map"
            >
              <TileLayer
                attribution={TILE_ATTRIBUTION}
                url={isDarkMode ? DARK_TILE_URL : LIGHT_TILE_URL}
              />
              <MapController center={mapCenter} zoom={14} />
              {locationsWithCoords.map((location) => (
                <Marker
                  key={location.id}
                  position={[location.latitude!, location.longitude!]}
                  icon={goldMarkerIcon}
                  data-testid={`marker-${location.id}`}
                >
                  <Popup className="modern-popup">
                    <div className="text-sm min-w-[140px]">
                      <p className="font-semibold text-foreground">{location.name}</p>
                      <p className="text-muted-foreground capitalize text-xs mt-1">{location.type}</p>
                      {location.address && (
                        <p className="text-muted-foreground text-xs mt-1">{location.address}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-inset ring-border/50" />
          </div>
          {locationsWithCoords.length === 0 && locations && locations.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Add coordinates to your locations to see them on the map
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            All Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !locations || locations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No locations yet</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                Add First Location
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {locations.map((location) => {
                const TypeIcon = getTypeIcon(location.type);
                const hasCoords = location.latitude != null && location.longitude != null;
                return (
                  <Card 
                    key={location.id} 
                    data-testid={`location-card-${location.id}`}
                    className={hasCoords ? "cursor-pointer hover-elevate" : ""}
                    onClick={() => hasCoords && handleLocationCardClick(location)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <TypeIcon className="h-5 w-5 text-gold" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{location.name}</h3>
                            <Badge variant="secondary" className="mt-1 capitalize">
                              {location.type}
                            </Badge>
                            {location.address && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {location.address}
                              </p>
                            )}
                            {hasCoords && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!location.isActive && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(location);
                            }}
                            data-testid={`button-edit-${location.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingLocation ? "Edit Location" : "Add New Location"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Downtown Pop-up" data-testid="input-location-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main St" data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="40.7128"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                          data-testid="input-latitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="-74.0060"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                          data-testid="input-longitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div>
                      <FormLabel className="mb-0">Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Available for orders</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLocationMutation.isPending}>
                  {createLocationMutation.isPending ? "Saving..." : editingLocation ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
