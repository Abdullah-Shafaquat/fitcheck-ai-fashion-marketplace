"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiPackage,
  FiHeart,
  FiMapPin,
  FiSettings,
  FiBell,
  FiLogOut,
  FiChevronRight,
  FiEdit2,
  FiShoppingBag,
  FiTruck,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";

interface UserData {
  name: string;
  email: string;
  provider: string;
  image?: string | null;
  phone?: string | null;
  accountStatus?: string;
}

interface ApiOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  total: number;
  status: string;
  paymentStatus: string;
  itemCount: number;
}

interface Order {
  id: string;
  orderNo: string;
  date: string;
  total: number;
  status: string;
  paymentStatus: string;
  items: number;
}

const statusColors: Record<string, { bg: string; text: string; icon: typeof FiCheckCircle }> = {
  Pending: { bg: "bg-gray-100", text: "text-gray-600", icon: FiClock },
  Confirmed: { bg: "bg-sky-50", text: "text-sky-600", icon: FiCheckCircle },
  Delivered: { bg: "bg-emerald-50", text: "text-emerald-600", icon: FiCheckCircle },
  Shipped: { bg: "bg-blue-50", text: "text-blue-600", icon: FiTruck },
  "Out for Delivery": { bg: "bg-indigo-50", text: "text-indigo-600", icon: FiTruck },
  Processing: { bg: "bg-amber-50", text: "text-amber-600", icon: FiClock },
  Packed: { bg: "bg-amber-50", text: "text-amber-600", icon: FiPackage },
  "Cancel Requested": { bg: "bg-violet-50", text: "text-violet-600", icon: FiClock },
  "Refund Requested": { bg: "bg-purple-50", text: "text-purple-600", icon: FiClock },
  "Refund Approved": { bg: "bg-purple-50", text: "text-purple-600", icon: FiClock },
  "Refund Rejected": { bg: "bg-purple-50", text: "text-purple-600", icon: FiClock },
  Cancelled: { bg: "bg-gray-100", text: "text-gray-500", icon: FiPackage },
  Refunded: { bg: "bg-red-50", text: "text-red-600", icon: FiPackage },
};

const paymentStatusColors: Record<string, { bg: string; text: string }> = {
  PAID: { bg: "bg-emerald-50", text: "text-emerald-600" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-600" },
  FAILED: { bg: "bg-red-50", text: "text-red-600" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-500" },
};

export default function AccountPage() {
  const router = useRouter();
  const { getWishlistCount } = useStore();
  const [user, setUser] = useState<UserData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [redirected, setRedirected] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(
          data.orders.slice(0, 3).map((o: ApiOrder) => ({
            id: o.id,
            orderNo: o.orderNo,
            date: new Date(o.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            total: o.total,
            status: o.status,
            paymentStatus: o.paymentStatus,
            items: o.itemCount ?? 0,
          }))
        );
      }
    } catch {
      setOrders([]);
    }
  }, []);

  // Load REAL profile (and counts) from the server — authoritative, not from
  // possibly-stale localStorage.
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/account/profile");
      if (res.status === 401) {
        setRedirected(true);
        router.replace(`/login?returnUrl=${encodeURIComponent("/account")}`);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        const fresh: UserData = {
          name: data.user.name,
          email: data.user.email,
          provider: data.user.provider,
          image: data.user.image ?? null,
          phone: data.user.phone ?? null,
          accountStatus: data.user.accountStatus,
        };
        setUser(fresh);
        setName(fresh.name || "");
        setPhone(fresh.phone || "");
        try {
          localStorage.setItem("fitcheck-user", JSON.stringify(fresh));
        } catch {}
      }
    } catch {
      /* keep localStorage fallback */
    } finally {
      setLoadingProfile(false);
    }
  }, [router]);

  useEffect(() => {
    // Immediate optimistic render from localStorage, then reconcile with the
    // real profile from the server.
    let stored: UserData | null = null;
    try {
      const raw = localStorage.getItem("fitcheck-user");
      stored = raw ? (JSON.parse(raw) as UserData) : null;
    } catch {
      stored = null;
    }

    if (stored) {
      setUser(stored);
      setName(stored.name || "");
      setPhone(stored.phone || "");
    } else {
      setLoadingProfile(true);
    }

    loadProfile();
    loadOrders();
    setWishlistCount(getWishlistCount());

    (async () => {
      try {
        const [nRes, aRes] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/addresses"),
        ]);
        const nData = await nRes.json();
        const aData = await aRes.json();
        if (Array.isArray(nData.notifications)) setNotificationCount(nData.notifications.length);
        if (Array.isArray(aData.addresses)) setAddressCount(aData.addresses.length);
      } catch {
        /* non-critical */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (redirected) return;
    if (!user && !loadingProfile && !localStorage.getItem("fitcheck-user")) {
      router.replace(`/login?returnUrl=${encodeURIComponent("/account")}`);
    }
  }, [user, loadingProfile, redirected, router]);

  const handleSave = async () => {
    if (!user) return;
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Could not update profile.");
        return;
      }
      const updated: UserData = {
        name: data.user.name,
        email: data.user.email,
        provider: data.user.provider,
        image: data.user.image ?? null,
        phone: data.user.phone ?? null,
        accountStatus: data.user.accountStatus,
      };
      setUser(updated);
      try {
        localStorage.setItem("fitcheck-user", JSON.stringify(updated));
      } catch {}
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("fitcheck-user");
    router.push("/");
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  const isActive = !user || user.accountStatus !== "BLOCKED";

  if (redirected) return null;
  if (loadingProfile && !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
              <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/" className="hover:text-[#FF6B35] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-secondary font-medium">My Account</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="editorial-title text-3xl sm:text-4xl text-[#1F1F1F] mb-2">My Account</h1>
            <p className="text-gray-400 text-sm">Manage your profile and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Profile Card */}
            <div className="lg:col-span-1 space-y-6">
              {/* Avatar Card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[#FF6B35] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FF6B35]/20">
                  {user.image && !avatarFailed ? (
                    <img
                      src={user.image}
                      alt="Profile photo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span className="text-white text-2xl font-bold">{initials}</span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[#1F1F1F]">{user.name}</h2>
                <p className="text-xs text-gray-400 mt-1">{user.email}</p>
                {isActive ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active Member
                  </div>
                ) : (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Account Suspended
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {[
                  { icon: FiPackage, label: "My Orders", href: "/orders", count: orders.length || undefined },
                  { icon: FiHeart, label: "Wishlist", href: "/wishlist", count: wishlistCount || undefined },
                  { icon: FiMapPin, label: "Addresses", href: "/account/addresses", count: addressCount || undefined },
                  { icon: FiBell, label: "Notifications", href: "/account/notifications", count: notificationCount || undefined },
                  { icon: FiSettings, label: "Settings", href: "/account/settings" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <Icon size={18} className="text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#1F1F1F] transition-colors flex-1">
                        {item.label}
                      </span>
                      {item.count && (
                        <span className="text-[10px] font-bold bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      )}
                      <FiChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  );
                })}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <FiLogOut size={16} />
                Sign Out
              </button>
            </div>

            {/* Right Column — Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Section */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#1F1F1F]">Personal Information</h3>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors"
                    >
                      <FiEdit2 size={13} />
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditing(false)}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {saved && (
                  <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600 font-medium animate-in fade-in duration-200">
                    Profile updated successfully!
                  </div>
                )}
                {saveError && (
                  <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium animate-in fade-in duration-200">
                    {saveError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      <FiUser size={12} className="inline mr-1" />
                      Full Name
                    </label>
                    {editing ? (
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 transition-all"
                      />
                    ) : (
                      <p className="px-4 py-3 text-sm text-[#1F1F1F] bg-gray-50 rounded-xl">{user.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      <FiMail size={12} className="inline mr-1" />
                      Email Address
                    </label>
                    <p className="px-4 py-3 text-sm text-[#1F1F1F] bg-gray-50 rounded-xl">{user.email}</p>
                    <p className="text-[10px] text-gray-300 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      <FiPhone size={12} className="inline mr-1" />
                      Phone Number
                    </label>
                    {editing ? (
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 3XX XXXXXXX"
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 transition-all placeholder:text-gray-300"
                      />
                    ) : (
                      <p className="px-4 py-3 text-sm text-[#1F1F1F] bg-gray-50 rounded-xl">{phone || "Not set"}</p>
                    )}
                  </div>

                  {/* Provider */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Signed in with
                    </label>
                    <p className="px-4 py-3 text-sm text-[#1F1F1F] bg-gray-50 rounded-xl capitalize">{user.provider}</p>
                  </div>
                </div>

                {editing && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-[#1F1F1F]">Recent Orders</h3>
                  <Link
                    href="/orders"
                    className="text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {orders.map((order) => {
                    const sc = statusColors[order.status] || statusColors.Processing;
                    const StatusIcon = sc.icon;
                    const pc = paymentStatusColors[order.paymentStatus] || paymentStatusColors.PENDING;
                    return (
                      <Link
                        key={order.id}
                        href="/orders"
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF6B35]/5 transition-colors">
                          <FiShoppingBag size={18} className="text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-[#1F1F1F]">{order.orderNo}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                              <StatusIcon size={10} />
                              {order.status}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${pc.bg} ${pc.text}`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {order.date} &bull; {order.items} items
                          </p>
                        </div>
                        <p className="text-sm font-bold text-[#1F1F1F]">
                          Rs {order.total.toLocaleString()}
                        </p>
                      </Link>
                    );
                  })}
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      No orders yet.{" "}
                      <Link href="/shop" className="text-[#FF6B35] hover:underline font-semibold">
                        Start shopping
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Recent Orders", value: String(orders.length), color: "bg-blue-50 text-blue-600" },
                  { label: "Recent Spent", value: `Rs ${orders.reduce((s, o) => s + o.total, 0).toLocaleString()}`, color: "bg-emerald-50 text-emerald-600" },
                  { label: "Wishlist Items", value: String(wishlistCount), color: "bg-orange-50 text-[#FF6B35]" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center min-w-0">
                    <p className={`text-base sm:text-lg font-bold break-words ${stat.color.split(" ")[1]}`}>{stat.value}</p>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
