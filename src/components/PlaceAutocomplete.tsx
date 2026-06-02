import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps, PP_CENTER, PP_RADIUS_METERS } from "@/lib/google-maps-loader";
import { Loader2, MapPin } from "lucide-react";

export interface PlaceValue {
  label: string;
  placeId: string;
  lat: number;
  lng: number;
}

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

interface Props {
  value: PlaceValue | null;
  onChange: (v: PlaceValue | null) => void;
  placeholder?: string;
  id?: string;
}

export function PlaceAutocomplete({ value, onChange, placeholder, id }: Props) {
  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync external value -> input text
  useEffect(() => {
    if (value && value.label !== text) setText(value.label);
    if (!value && !document.activeElement?.id?.includes(id ?? "")) {
      // não força reset enquanto digita
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.placeId]);

  // Fecha ao clicar fora
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const fetchSuggestions = async (input: string) => {
    if (input.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const g = await loadGoogleMaps();
      const placesLib = (await g.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLib;

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }
      console.log("[PLACES] QUERY", input);
      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        language: "pt-BR",
        region: "BR",
        includedRegionCodes: ["br"],
        locationBias: {
          center: PP_CENTER,
          radius: PP_RADIUS_METERS,
        },
      });

      const mapped: Suggestion[] = [];
      for (const s of results) {
        const p = s.placePrediction;
        if (!p || !p.placeId) continue;
        mapped.push({
          placeId: p.placeId,
          primary: p.mainText?.toString() ?? p.text.toString(),
          secondary: p.secondaryText?.toString() ?? "",
        });
      }
      setSuggestions(mapped);
      setOpen(true);
    } catch (err) {
      console.error("[PLACES] ERROR", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (v: string) => {
    setText(v);
    if (value) onChange(null); // invalida seleção anterior ao editar
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 250);
  };

  const handleSelect = async (s: Suggestion) => {
    setOpen(false);
    setLoading(true);
    try {
      const g = await loadGoogleMaps();
      const placesLib = (await g.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const place = new placesLib.Place({ id: s.placeId });
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      const loc = place.location;
      if (!loc) throw new Error("Sem coordenadas");
      const label = place.formattedAddress || `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
      const result: PlaceValue = {
        label,
        placeId: s.placeId,
        lat: loc.lat(),
        lng: loc.lng(),
      };
      console.log("[PLACES] SELECTED", result);
      setText(label);
      onChange(result);
      sessionTokenRef.current = null; // sessão consumida ao selecionar
    } catch (err) {
      console.error("[PLACES] DETAIL ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        className="h-12"
        value={text}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg max-h-72 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2 text-sm"
            >
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-medium truncate">{s.primary}</div>
                {s.secondary && (
                  <div className="text-xs text-muted-foreground truncate">{s.secondary}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}