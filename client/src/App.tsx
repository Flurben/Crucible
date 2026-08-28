import { useAppStore } from "./store.ts";
import { MainMenuScreen } from "./screens/MainMenuScreen.tsx";
import { PlayMenuScreen } from "./screens/PlayMenuScreen.tsx";
import { QueuingScreen } from "./screens/QueuingScreen.tsx";
import { GameScreen } from "./screens/GameScreen.tsx";
import { PostGameScreen } from "./screens/PostGameScreen.tsx";

export function App() {
  const screen = useAppStore((s) => s.screen);
  switch (screen) {
    case "main-menu":   return <MainMenuScreen />;
    case "play-menu":   return <PlayMenuScreen />;
    case "queuing":     return <QueuingScreen />;
    case "game":        return <GameScreen />;
    case "tutorial":    return <GameScreen />;
    case "replay":      return <GameScreen />;
    case "post-game":   return <PostGameScreen />;
    default:            return <MainMenuScreen />;
  }
}
