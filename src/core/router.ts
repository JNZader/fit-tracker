import type { TabId } from "@core/types"
import { TAB_IDS } from "@core/types"
import { AppState } from "@core/state"

// --- Constants ---

const VALID_TABS = Object.values(TAB_IDS) as TabId[]
const DEFAULT_TAB: TabId = TAB_IDS.RUTINA

// --- HashRouter singleton ---

export class HashRouter {
  private static instance: HashRouter | undefined
  private currentTab: TabId = DEFAULT_TAB
  private initialized = false

  private constructor() {}

  static getInstance(): HashRouter {
    if (!HashRouter.instance) {
      HashRouter.instance = new HashRouter()
    }
    return HashRouter.instance
  }

  /**
   * Initialize the router.
   * Reads the current hash, activates the matching tab,
   * and registers the hashchange listener.
   */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    // Show the initial tab from current URL hash
    this.activateFromHash()

    // Listen for future hash changes
    window.addEventListener("hashchange", () => {
      this.activateFromHash()
    })
  }

  navigateTo(tab: TabId): void {
    window.location.hash = tab
  }

  getCurrentTab(): TabId {
    return this.currentTab
  }

  // --- Private ---

  private activateFromHash(): void {
    const raw = window.location.hash.replace(/^#/, "").trim()
    const tab = this.resolveTab(raw)

    this.currentTab = tab

    this.updateDOM(tab)

    AppState.getInstance().emit("tab:changed", { tab })
  }

  private resolveTab(raw: string): TabId {
    if ((VALID_TABS as string[]).includes(raw)) {
      return raw as TabId
    }
    return DEFAULT_TAB
  }

  private updateDOM(activeTab: TabId): void {
    // Show/hide .sec elements based on data-tab attribute
    const sections = document.querySelectorAll<HTMLElement>(".sec")
    for (const section of sections) {
      const sectionTab = section.dataset["tab"]
      if (sectionTab === activeTab) {
        section.style.display = "block"
        section.removeAttribute("hidden")
      } else {
        section.style.display = "none"
        section.setAttribute("hidden", "")
      }
    }

    // Update active state on nav links
    const navLinks = document.querySelectorAll<HTMLElement>("[data-nav-tab]")
    for (const link of navLinks) {
      const linkTab = link.dataset["navTab"]
      if (linkTab === activeTab) {
        link.classList.add("active")
        link.setAttribute("aria-current", "page")
      } else {
        link.classList.remove("active")
        link.removeAttribute("aria-current")
      }
    }
  }
}

// --- Convenience export ---

export function navigateTo(tab: TabId): void {
  HashRouter.getInstance().navigateTo(tab)
}

export function getCurrentTab(): TabId {
  return HashRouter.getInstance().getCurrentTab()
}

// --- Auto-init on DOMContentLoaded ---

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    HashRouter.getInstance().init()
  })
}
