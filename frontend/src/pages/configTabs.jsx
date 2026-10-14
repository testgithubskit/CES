import { createContext, useContext } from 'react'

const ConfigTabsContext = createContext(null)

export function ConfigTabsProvider({ value, onChange, tabs, children }) {
  return (
    <ConfigTabsContext.Provider value={{ value, onChange, tabs }}>
      {children}
    </ConfigTabsContext.Provider>
  )
}

export function ConfigSwitch() {
  const chrome = useContext(ConfigTabsContext)
  if (!chrome) return null
  return (
    <div className="flex h-8 items-center rounded-lg bg-muted p-0.5">
      {chrome.tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => chrome.onChange(key)}
          className={`h-7 rounded-md px-3 text-sm font-semibold ${chrome.value === key ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
