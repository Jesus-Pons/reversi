import { createFileRoute } from "@tanstack/react-router"
import { GamePage } from "@/pages/GamePage"

export const Route = createFileRoute("/_layout/games/$gameId")({
  component: GameRouteComponent,
})

function GameRouteComponent() {
  const { gameId } = Route.useParams()
  
  return <GamePage gameId={gameId} />
}
