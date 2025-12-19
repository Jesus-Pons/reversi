import { createFileRoute } from "@tanstack/react-router"
import { GamePage } from "@/pages/GamePage" // Asegúrate que esta ruta es correcta

// Definimos la ruta usando la cadena exacta que coincide con la estructura de carpetas
export const Route = createFileRoute("/_layout/games/$gameId")({
  component: GameRouteComponent,
})

function GameRouteComponent() {
  // Ahora TypeScript sabrá que gameId existe porque el generador ha leído el nombre del archivo "$gameId.tsx"
  const { gameId } = Route.useParams()
  
  // Renderizamos tu página pasando el ID limpio
  return <GamePage gameId={gameId} />
}