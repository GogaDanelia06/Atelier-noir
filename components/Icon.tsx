const PATHS: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  bag: <><path d="M6 8h12l1 12H5z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  gift: <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />,
  spray: <path d="M9 8h5v12H9zM11 8V5h4M15 4h4M15 7h3M16 10h3" />,
  jar: <><path d="M5 10h14v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /><path d="M4 6h16v4H4zM9 14c1.5-1 4.5-1 6 0" /></>,
  lip: <><path d="M9 21h6v-9H9zM9 12V7l6-3v8" /><path d="M8 21h8" /></>,
  pump: <><path d="M8 11h8v10H8zM10 11V8h4v3M12 8V5h6" /></>,
  chat: <path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1-5a8 8 0 1 1 17-6Z" />,
  prev: <path d="M15 5 8 12l7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  split: <path d="M9 6 4 12l5 6M15 6l5 6-5 6" />
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}
