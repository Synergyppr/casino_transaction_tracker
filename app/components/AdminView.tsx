"use client";
import { PageHeading } from "./PageHeading";
import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  KeyRound,
  Lock,
  Pencil,
  Unlock,
  UserPlus,
  X,
} from "lucide-react";
import type { Cashier } from "../lib/types";
import { getAllProperties, type Property } from "../lib/api";
import { PropertyMultiSelect } from "./PropertyMultiSelect";
import { Modal } from "./Modal";
import {
  EMPTY_CASHIER_DRAFT,
  buildEditDraft,
  createCashierFromDraft,
  toggleCashierActiveApi,
  updateCashierFromDraft,
  validateCreateCashierDraft,
  validateEditCashierDraft,
  type AddCashierDraft,
  type EditCashierDraft,
} from "../helpers/admin";

export function AdminView({
  cashiers,
  setCashiers,
  user,
  onDataChange,
}: {
  cashiers: Cashier[];
  setCashiers: React.Dispatch<React.SetStateAction<Cashier[]>>;
  user: Cashier;
  onDataChange: () => Promise<void>;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");
  const loadProperties = useCallback(async () => {
    setPropertiesLoading(true); setPropertiesError("");
    try { setProperties(await getAllProperties()); }
    catch (error) { setPropertiesError(error instanceof Error ? error.message : "Unable to load properties"); }
    finally { setPropertiesLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void loadProperties(); }); }, [loadProperties]);
  const [addModal, setAddModal] = useState(false);
  const [draft, setDraft] = useState<AddCashierDraft>(EMPTY_CASHIER_DRAFT);
  const [formError, setFormError] = useState("");
  const [editModal, setEditModal] = useState<EditCashierDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [deactivateModal, setDeactivateModal] = useState<Cashier | null>(null);
  const [deactivateFromEdit, setDeactivateFromEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetPinModal, setResetPinModal] = useState<Cashier | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [resetPinError, setResetPinError] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = search.trim().toLowerCase();
  const filtered = cashiers.filter(c => (tab === "active" ? c.active : !c.active) && (!query || [c.name, c.role, c.employeeCode, c.phone, c.email].some(value => value?.toLowerCase().includes(query))));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCashiers = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);


  function showSuccess(message: string) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2500);
  }

  function closeResetPinModal() {
    if (saving) return;

    setResetPinModal(null);
    setNewPin("");
    setConfirmPin("");
    setResetPinError("");
  }

  function openResetPinModal(c: Cashier) {
    setResetPinModal(c);
    setNewPin("");
    setConfirmPin("");
    setResetPinError("");
  }

  async function toggleActive(c: Cashier) {
    if (saving) return;

    // Reactivation requires a new PIN, so inactive cashiers use the reset modal.
    if (!c.active) {
      openResetPinModal(c);
      return;
    }

    setDeactivateFromEdit(false);
    setDeactivateModal(c);
  }

  function closeDeactivateModal() {
    if (saving) return;

    setDeactivateModal(null);
  }

  async function confirmDeactivation() {
    if (!deactivateModal || saving) return;

    if (deactivateFromEdit) {
      await submitEdit(true);
      setDeactivateModal(null);
      return;
    }

    const c = deactivateModal;
    setSaving(true);

    try {
      await toggleCashierActiveApi(c, user.name);

      setCashiers((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: false } : x))
      );

      await onDataChange();
      setDeactivateModal(null);
      showSuccess("Cashier deactivated successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate cashier");
    } finally {
      setSaving(false);
    }
  }

  async function submitReactivation() {
    if (!resetPinModal || saving) return;

    if (!/^\d{4}$/.test(newPin)) {
      setResetPinError("Enter a valid 4-digit PIN.");
      return;
    }

    if (newPin !== confirmPin) {
      setResetPinError("PINs do not match.");
      return;
    }

    setSaving(true);
    setResetPinError("");

    try {
      const reactivationDraft: EditCashierDraft = {
        ...buildEditDraft(resetPinModal),
        active: true,
        pin: newPin,
      };

      await updateCashierFromDraft(reactivationDraft, user.name);

      setCashiers((prev) =>
        prev.map((cashier) =>
          cashier.id === resetPinModal.id
            ? { ...cashier, active: true }
            : cashier
        )
      );

      const cashierName = resetPinModal.name;

      setResetPinModal(null);
      setNewPin("");
      setConfirmPin("");
      setResetPinError("");

      await onDataChange();
      showSuccess(`${cashierName} was reactivated and the PIN was reset.`);
    } catch (err) {
      setResetPinError(
        err instanceof Error
          ? err.message
          : "Failed to reactivate cashier and reset PIN"
      );
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(c: Cashier) {
    setEditModal(buildEditDraft(c));
    setEditError("");
  }

  async function submitEdit(deactivationConfirmed = false) {
    if (!editModal || saving) return;

    const validationError = validateEditCashierDraft(editModal);

    if (validationError) {
      setEditError(validationError);
      return;
    }

    const currentCashier = cashiers.find(c => c.id === editModal.id);

    if (currentCashier?.active && !editModal.active && !deactivationConfirmed) {
      setDeactivateFromEdit(true);
      setDeactivateModal(currentCashier);
      return;
    }

    setSaving(true);

    try {
      await updateCashierFromDraft(editModal, user.name);

      setCashiers((prev) =>
        prev.map((c) =>
          c.id === editModal.id
            ? {
              ...c,
              name: [editModal.firstName, editModal.lastName]
                .filter(Boolean)
                .join(" "),
              role: editModal.role,
              propertyIds: editModal.propertyIds ?? c.propertyIds,
              employeeCode: editModal.employeeCode || undefined,
              phone: editModal.phone || undefined,
              active: editModal.active,
              // propertyIds: editModal.propertyIds ?? c.propertyIds,  
            }
            : c
        )
      );

      setEditModal(null);
      setEditError("");

      await onDataChange();

      showSuccess("Cashier profile updated successfully.");
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update cashier"
      );
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const validationError = validateCreateCashierDraft(draft);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);

    try {
      const created = await createCashierFromDraft(draft);

      setCashiers((prev) => [...prev, created]);
      setDraft(EMPTY_CASHIER_DRAFT);
      setAddModal(false);
      setFormError("");

      await onDataChange();

      showSuccess("Cashier account created successfully.");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create cashier"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
      <PageHeading title="Administration" subtitle="Manage cashier accounts, property access, and staff roles." icon={UserPlus} />
      {successMessage && (
        <div className="flex items-center gap-2 rounded-sm border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
          <CheckCircle2 size={15} />
          {successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Cashier Accounts &mdash; {cashiers.length} registered
        </p>

        {user.role === "manager" && (
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors cursor-pointer"
          >
            <UserPlus size={13} />
            Add Cashier
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["active", "inactive"] as const).map((t) => {
          const count = cashiers.filter((c) =>
            t === "active" ? c.active : !c.active
          ).length;

          return (
            <button
              key={t}
              onClick={() => { setTab(t); setCurrentPage(1); }}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer ${tab === t
                ? t === "active"
                  ? "text-emerald-400 border-emerald-400"
                  : "text-rose-400 border-rose-400"
                : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label="Search cashiers" placeholder="Search name, role, employee code, phone..." value={search} onChange={event => { setSearch(event.target.value); setCurrentPage(1); }} className="w-full min-w-0 rounded border border-border bg-secondary py-2 pl-9 pr-3 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">Rows per page
          <select aria-label="Cashiers per page"
            value={pageSize}
            onChange={event => {
              setPageSize(Number(event.target.value));
              setCurrentPage(1);
            }}
            className="rounded border border-border bg-secondary px-2 py-2">
            {[10, 25, 50].map(size =>
              <option key={size} value={size}>{size}</option>
            )}
          </select>
        </label>
      </div>
      <div className="bg-card border border-border rounded overflow-x-auto">
        <table
          role="table"
          data-mobile-stack
          className="w-full lg:min-w-160 text-sm
          max-lg:block max-lg:w-full max-lg:min-w-0! max-lg:max-w-full max-lg:table-auto
          max-lg:[&>colgroup]:hidden
          max-lg:[&>thead]:absolute max-lg:[&>thead]:size-px max-lg:[&>thead]:p-0
          max-lg:[&>thead]:overflow-hidden max-lg:[&>thead]:[clip-path:inset(50%)] max-lg:[&>thead]:whitespace-nowrap
          max-lg:[&>tbody]:block max-lg:[&>tbody]:w-full max-lg:[&>tfoot]:block max-lg:[&>tfoot]:w-full
          max-lg:[&>tbody>tr]:flex max-lg:[&>tbody>tr]:flex-col max-lg:[&>tbody>tr]:w-full
          max-lg:[&>tbody>tr]:p-2 max-lg:[&>tbody>tr]:border-b max-lg:[&>tbody>tr]:border-border max-lg:[&>tbody>tr]:mb-2
          max-lg:[&>tfoot>tr]:flex max-lg:[&>tfoot>tr]:flex-col max-lg:[&>tfoot>tr]:w-full
          max-lg:[&>tfoot>tr]:p-2 max-lg:[&>tfoot>tr]:border-b max-lg:[&>tfoot>tr]:border-border
          max-lg:[&>tbody>tr>td]:grid max-lg:[&>tbody>tr>td]:grid-cols-1 max-lg:[&>tbody>tr>td]:items-start
          max-lg:[&>tbody>tr>td]:gap-1 max-lg:[&>tbody>tr>td]:w-full max-lg:[&>tbody>tr>td]:min-w-0
          max-lg:[&>tbody>tr>td]:p-2 max-lg:[&>tbody>tr>td]:text-left max-lg:[&>tbody>tr>td]:whitespace-normal max-lg:[&>tbody>tr>td]:wrap-anywhere
          max-lg:[&>tfoot>tr>td]:grid max-lg:[&>tfoot>tr>td]:grid-cols-1 max-lg:[&>tfoot>tr>td]:items-start
          max-lg:[&>tfoot>tr>td]:gap-1 max-lg:[&>tfoot>tr>td]:w-full max-lg:[&>tfoot>tr>td]:min-w-0
          max-lg:[&>tfoot>tr>td]:p-2 max-lg:[&>tfoot>tr>td]:text-left max-lg:[&>tfoot>tr>td]:whitespace-normal max-lg:[&>tfoot>tr>td]:wrap-anywhere
          max-lg:[&_td[data-label]:not([data-label=''])]:before:content-[attr(data-label)]
          max-lg:[&_td[data-label]:not([data-label=''])]:before:text-muted-foreground
          max-lg:[&_td[data-label]:not([data-label=''])]:before:text-[0.6875rem]
          max-lg:[&_td[data-label]:not([data-label=''])]:before:font-medium max-lg:[&_td[data-label]:not([data-label=''])]:before:text-left
          max-lg:[&>tbody>tr>td[colspan]]:block max-lg:[&>tfoot>tr>td[colspan]]:block
          max-lg:[&>tbody>tr[data-transactions-row]]:p-0 max-lg:[&>tbody>tr[data-transactions-row]>td]:p-0">
          <thead role="rowgroup">
            <tr role="row" className="border-b border-border bg-secondary/40">
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Name
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Role
              </th>
              <th role="columnheader" className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>

              {user.role === "manager" && (
                <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody role="rowgroup">
            {filtered?.length === 0 ? (
              <tr role="row">
                <td role="cell" data-label=""
                  colSpan={user.role === "manager" ? 4 : 3}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {query ? "No cashiers match your search." : `No ${tab} cashiers`}
                </td>
              </tr>
            ) : (
              paginatedCashiers?.map((c, i) => (
                <tr role="row"
                  key={c.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-secondary/20" : ""
                    }`}
                >
                  <td role="cell" data-label="Name" className="px-4 py-3 font-semibold">
                    <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                      {c?.firstName} {" "} {c?.lastName}
                    </div>
                  </td>

                  <td role="cell" data-label="Role" className="px-4 py-3 text-xs text-muted-foreground capitalize font-mono">
                    <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                      {c.role}
                    </div>
                  </td>

                  <td role="cell" data-label="Status" className="px-4 py-3 text-center">
                    <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-sm font-mono border ${c.active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-secondary text-muted-foreground border-border"
                          }`}
                      >
                        {c.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </td>

                  {user.role === "manager" && (
                    <td role="cell" data-label="Actions" className="px-4 py-3 text-right">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleActive(c)}
                            disabled={saving}
                            className="px-2 py-1 text-xs bg-secondary border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors 
                          flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {c.active ? <Lock size={10} /> : <Unlock size={10} />}
                            {c.active ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            onClick={() => openEditModal(c)}
                            disabled={saving}
                            className="px-2 py-1 text-xs bg-secondary border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors 
                          flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <Pencil size={10} />
                            Update Profile
                          </button>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-muted-foreground">
        <p>Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} cashiers</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Previous cashier page" disabled={safePage === 1} onClick={() => setCurrentPage(safePage - 1)} className="inline-flex items-center gap-1 rounded border border-border px-3 py-2 disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
          <span>Page {safePage} of {totalPages}</span>
          <button type="button" aria-label="Next cashier page" disabled={safePage === totalPages} onClick={() => setCurrentPage(safePage + 1)} className="inline-flex items-center gap-1 rounded border border-border px-3 py-2 disabled:opacity-40">Next <ChevronRight size={14} /></button>
        </div>
      </div>
      {addModal && (
        <Modal onClose={() => setAddModal(false)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Add Cashier Account</h3>

            <button
              onClick={() => setAddModal(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                First Name
              </label>
              <input
                value={draft.firstName}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, firstName: e.target.value }));
                  setFormError("");
                }}
                placeholder="First name"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Last Name
              </label>
              <input
                value={draft.lastName}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, lastName: e.target.value }));
                  setFormError("");
                }}
                placeholder="Last name"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <PropertyMultiSelect properties={properties} value={draft.propertyIds} onChange={propertyIds => setDraft(previous => ({ ...previous, propertyIds }))} disabled={saving} loading={propertiesLoading} error={propertiesError} onRetry={() => void loadProperties()} />
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Role
              </label>
              <select
                value={draft.role}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    role: e.target.value as AddCashierDraft["role"],
                  }))
                }
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                <option value="cashier">Cashier</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                PIN (4 digits)
              </label>
              <input
                value={draft.pin}
                onChange={(e) => {
                  setDraft((p) => ({
                    ...p,
                    pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }));
                  setFormError("");
                }}
                placeholder="_ _ _ _"
                maxLength={4}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Employee Code (optional)
              </label>
              <input
                value={draft.employeeCode}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, employeeCode: e.target.value }))
                }
                placeholder="EMP-001"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Phone (optional)
              </label>
              <input
                value={draft.phone}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="(555) 123-4567"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            {formError && (
              <p className="text-xs text-destructive">{formError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex 
              items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Create Account
            </button>

            <button
              onClick={() => setAddModal(false)}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {resetPinModal && (
        <Modal onClose={closeResetPinModal}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <KeyRound size={16} />
              </div>

              <div>
                <h3 className="text-sm font-semibold">Reactivate Cashier</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reset the PIN for {resetPinModal.name}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeResetPinModal}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              aria-label="Close PIN reset modal"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mb-5 rounded-sm border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
            Reactivating this cashier requires a new 4-digit PIN. The previous
            PIN will no longer work.
          </div>

          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                autoFocus
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setResetPinError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPin.length === 4 && confirmPin.length === 4) {
                    void submitReactivation();
                  }
                }}
                placeholder="_ _ _ _"
                maxLength={4}
                disabled={saving}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono tracking-[0.35em] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Confirm New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(
                    e.target.value.replace(/\D/g, "").slice(0, 4)
                  );
                  setResetPinError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPin.length === 4 && confirmPin.length === 4) {
                    void submitReactivation();
                  }
                }}
                placeholder="_ _ _ _"
                maxLength={4}
                disabled={saving}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono tracking-[0.35em] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {resetPinError && (
              <p className="text-xs text-destructive">{resetPinError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submitReactivation()}
              disabled={
                saving ||
                newPin.length !== 4 ||
                confirmPin.length !== 4 ||
                newPin !== confirmPin
              }
              className="flex-1 h-9 bg-emerald-600 text-white rounded-sm text-sm font-medium hover:bg-emerald-600/85 transition-colors disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Unlock size={13} />
              )}
              Reactivate & Reset PIN
            </button>

            <button
              type="button"
              onClick={closeResetPinModal}
              disabled={saving}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {editModal && (
        <Modal onClose={() => setEditModal(null)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Update Profile</h3>

            <button
              onClick={() => setEditModal(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  First Name
                </label>
                <input
                  value={editModal.firstName}
                  disabled
                  className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-sm text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  value={editModal.lastName}
                  disabled
                  className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-sm text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <PropertyMultiSelect properties={properties} value={editModal.propertyIds} onChange={propertyIds => setEditModal(previous => previous ? { ...previous, propertyIds } : null)} disabled={saving} loading={propertiesLoading} error={propertiesError} onRetry={() => void loadProperties()} />
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Role
              </label>
              <select
                value={editModal.role}
                onChange={(e) =>
                  setEditModal((p) =>
                    p
                      ? {
                        ...p,
                        role: e.target.value as EditCashierDraft["role"],
                      }
                      : p
                  )
                }
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                <option value="cashier">Cashier</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                New PIN (leave empty to keep current)
              </label>
              <input
                value={editModal.pin}
                onChange={(e) => {
                  setEditModal((p) =>
                    p
                      ? {
                        ...p,
                        pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                      }
                      : p
                  );
                  setEditError("");
                }}
                placeholder="_ _ _ _"
                maxLength={4}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Employee Code
              </label>
              <input
                value={editModal.employeeCode}
                onChange={(e) =>
                  setEditModal((p) =>
                    p ? { ...p, employeeCode: e.target.value } : p
                  )
                }
                placeholder="EMP-001"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Phone
              </label>
              <input
                value={editModal.phone}
                onChange={(e) =>
                  setEditModal((p) => (p ? { ...p, phone: e.target.value } : p))
                }
                placeholder="(555) 123-4567"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Status
              </label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    onClick={() =>
                      setEditModal((p) => (p ? { ...p, active: val } : p))
                    }
                    className={`flex-1 h-9 rounded-sm text-sm transition-colors border cursor-pointer ${editModal.active === val
                      ? val
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {val ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>

            {editError && (
              <p className="text-xs text-destructive">{editError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void submitEdit()}
              disabled={saving}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex
              items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Save Changes
            </button>

            <button
              onClick={() => setEditModal(null)}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {deactivateModal && (
        <Modal onClose={closeDeactivateModal}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-destructive/25 bg-destructive/10 text-destructive">
                <Lock size={16} />
              </div>

              <h3 className="text-sm font-semibold">Deactivate Cashier</h3>
            </div>

            <button
              type="button"
              onClick={closeDeactivateModal}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              aria-label="Close deactivation dialog"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate {deactivateModal.name}?
            This cashier will no longer be able to sign in until their account
            is reactivated.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => void confirmDeactivation()}
              disabled={saving}
              className="flex-1 h-9 bg-destructive text-destructive-foreground rounded-sm text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? "Deactivating..." : "Deactivate"}
            </button>

            <button
              type="button"
              onClick={closeDeactivateModal}
              disabled={saving}
              autoFocus
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}