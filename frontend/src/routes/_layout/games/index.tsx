import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Plus, Play, Clock } from "lucide-react"

import { GamesService } from "@/client/sdk.gen"
import type { Game } from "@/client/types.gen"
import { Button } from "@/components/ui/button"

// Definimos la ruta /games/
export const Route = createFileRoute("/_layout/games/")({
  component: GamesDashboard,
})

function GamesDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar partidas al entrar
  useEffect(() => {
    const fetchGames = async () => {
      try {
        // Usamos el SDK para leer mis partidas (limitado a 20 por ejemplo)
        const response = await GamesService.readMyGames({ limit: 20 })
        setGames(response.data)
      } catch (error) {
        console.error("Error cargando partidas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Partidas</h1>
          <p className="text-muted-foreground">
            Gestiona tus partidas en curso o comienza una nueva.
          </p>
        </div>
        
        {/* Botón para ir a crear nueva partida (Necesitarás crear esta ruta luego) */}
        <Link to="/games/new">
          <Button className="gap-2">
            <Plus className="size-4" />
            Nueva Partida
          </Button>
        </Link>
      </div>

      {/* Lista de Partidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            Cargando partidas...
          </div>
        ) : games.length === 0 ? (
          <div className="col-span-full text-center py-10 bg-gray-50/5 rounded-lg border border-dashed">
            <p className="text-muted-foreground mb-4">No tienes partidas activas.</p>
            <Link to="/games/new">
              <Button variant="outline">Crear mi primera partida</Button>
            </Link>
          </div>
        ) : (
          games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))
        )}
      </div>
    </div>
  )
}

// Componente simple para la tarjeta de cada partida
function GameCard({ game }: { game: Game }) {
  const isFinished = !!game.winner
  
  return (
    <div className="flex flex-col p-5 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="font-semibold text-lg flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${game.current_turn === 'black' ? 'bg-black' : 'bg-white border border-gray-300'}`} />
            Turno: {game.current_turn === 'black' ? 'Negras' : 'Blancas'}
          </span>
          <span className="text-xs text-muted-foreground mt-1">ID: {game.id?.slice(0, 8)}...</span>
        </div>
        {isFinished ? (
           <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Terminada</span>
        ) : (
           <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
             <Clock className="size-3" /> En curso
           </span>
        )}
      </div>

      <div className="flex justify-between items-center mb-6 bg-gray-100/50 p-3 rounded-lg">
        <div className="text-center">
          <p className="text-xs font-bold uppercase text-gray-500">Negras</p>
          <p className="text-xl font-black">{game.score_black}</p>
        </div>
        <div className="text-gray-300">vs</div>
        <div className="text-center">
          <p className="text-xs font-bold uppercase text-gray-500">Blancas</p>
          <p className="text-xl font-black">{game.score_white}</p>
        </div>
      </div>

      <Link 
        to="/games/$gameId" 
        params={{ gameId: game.id! }} 
        className="mt-auto"
      >
        <Button className="w-full gap-2" variant={isFinished ? "secondary" : "default"}>
          <Play className="size-4" />
          {isFinished ? "Ver Resultado" : "Continuar Jugando"}
        </Button>
      </Link>
    </div>
  )
}