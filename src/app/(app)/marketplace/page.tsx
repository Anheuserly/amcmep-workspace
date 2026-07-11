"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { fetchMarketplace, toMarketplaceItem } from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  ShoppingCart, Search, Tag, MapPin, MessageCircle, Store, Heart, X
} from "lucide-react";
import type { MarketplaceItem } from "@/types";

const conditionColors = { new: "bg-green-100 text-green-700", used: "bg-yellow-100 text-yellow-700", refurbished: "bg-blue-100 text-blue-700" };

export default function MarketplacePage() {
  const { activeRole } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  const filtered = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = useMemo<string[]>(() => ["All", ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))], [items]);

  useEffect(() => {
    let alive = true;
    async function loadMarketplace() {
      setIsLoading(true);
      try {
        const docs = await fetchMarketplace({ limit: 120 });
        if (alive) setItems(docs.map(toMarketplaceItem).filter((item) => item.status === "active"));
      } catch {
        if (alive) toast.error("Unable to load marketplace");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadMarketplace();
    return () => { alive = false; };
  }, []);

  const handleContact = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setShowContactModal(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-500 mt-1">Equipment, parts, tools, and services</p>
        </div>
        {(activeRole === "partner" || activeRole === "administrator") && (
          <Button><Store className="h-4 w-4 mr-2" />My Listings</Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder="Search marketplace..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${selectedCategory === cat ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full"><Card><CardContent className="p-8 text-center text-sm text-gray-500">Loading marketplace...</CardContent></Card></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full"><EmptyState icon={<ShoppingCart className="h-12 w-12" />} title="No items found" description="Try adjusting your search or category filter" /></div>
        ) : (
          filtered.map((item) => (
            <Card key={item.$id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Image Placeholder */}
              <div className="h-40 bg-gray-100 flex items-center justify-center border-b border-gray-100 overflow-hidden">
                {item.images[0] ? (
                  <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center"><Store className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="text-xs text-gray-400">Service</p></div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  </div>
                  <Badge className={conditionColors[item.condition]}>{item.condition}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-lg font-bold text-gray-900">₹{item.price.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-gray-400">{item.currency}</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>{item.location}</span>
                  <span className="mx-1">•</span>
                  <span>{item.sellerName}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1" onClick={() => handleContact(item)}><MessageCircle className="h-4 w-4 mr-1" />Contact</Button>
                  <Button size="sm" variant="outline" className="px-2"><Heart className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">Contact Seller</h2><button onClick={() => setShowContactModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center"><Store className="h-6 w-6 text-gray-400" /></div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedItem.title}</p>
                  <p className="text-sm text-gray-500">₹{selectedItem.price.toLocaleString("en-IN")} • {selectedItem.sellerName}</p>
                </div>
              </div>
              <textarea className="w-full h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Hi, I'm interested in this item. Is it still available?" defaultValue={`Hi, I'm interested in "${selectedItem.title}". Is it still available?`} />
              <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setShowContactModal(false)}>Cancel</Button><Button className="flex-1" onClick={() => { toast.success("Message sent to seller!"); setShowContactModal(false); }}><MessageCircle className="h-4 w-4 mr-2" />Send Message</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
