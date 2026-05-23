import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Gamepad2, User, Play, Loader2, Users } from "lucide-react"

import { GamesService, UsersService } from "@/client/sdk.gen"
import type { UserPublic } from "@/client/types.gen"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { 
  AIParamsSelector, 
  type AIConfigInput 
} from "@/components/forms/AIParamsSelector"

export const Route = createFileRoute("/_layout/games/new")({
  component: NewGamePage,
})

function NewGamePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [opponentType, setOpponentType] = useState<'bot' | 'online' | 'local'>('bot')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opponents, setOpponents] = useState<UserPublic[]>([])
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>("")

  const [botConfig, setBotConfig] = useState<AIConfigInput | null>(null)

  useEffect(() => {
    if (opponentType !== 'online') return

    const fetchOpponents = async () => {
      try {
        const response = await UsersService.readOpponents({ limit: 100 })
        setOpponents(response.data)
        setSelectedOpponentId((current) => current || response.data[0]?.id || "")
      } catch (err) {
        console.error(err)
        setError("No se pudieron cargar los jugadores disponibles.")
      }
    }

    fetchOpponents()
  }, [opponentType])

  const handleSubmit = async () => {
    if (!user?.id) return
    setIsSubmitting(true)
    setError(null)

    try {
      const requestBody: any = {
        player_black_id: user.id,
        player_white_id: null,
        bot_white_config: null
      }

      if (opponentType === 'bot') {
        if (!botConfig) {
          setError("Configuración de IA inválida")
          setIsSubmitting(false)
          return
        }

        const { algorithm, heuristic, ...restParams } = botConfig
        
        requestBody.bot_white_config = {
          algorithm: algorithm,
          heuristic: heuristic,
          parameters: restParams
        }
      } else if (opponentType === 'online') {
        if (!selectedOpponentId) {
          setError("Selecciona un jugador para continuar.")
          setIsSubmitting(false)
          return
        }

        requestBody.player_white_id = selectedOpponentId
      } else {
        requestBody.player_white_id = user.id
      }

      const newGame = await GamesService.createGame({
        requestBody
      })

      navigate({ to: `/games/${newGame.id}` })

    } catch (err: any) {
      console.error(err)
      setError("Error al crear la partida. Revisa la consola.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Nueva Partida</h1>
        <p className="text-muted-foreground">Configura los parámetros del juego y elige tu oponente.</p>
      </div>

      <div className="grid gap-6">
        
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="size-5 text-blue-500" />
            Jugador 1 (Negras)
          </h2>
          <div className="flex items-center gap-3 bg-gray-50/10 p-3 rounded-lg border">
             <div className="size-8 rounded-full bg-black border border-gray-600"></div>
             <span className="font-medium">{user?.full_name || user?.email} (Tú)</span>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gamepad2 className="size-5 text-amber-500" />
            Oponente (Blancas)
          </h2>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setOpponentType('bot')}
              className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-all ${
                opponentType === 'bot' 
                  ? 'bg-amber-100 border-amber-500 text-amber-900 ring-1 ring-amber-500' 
                  : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Jugar contra IA
            </button>
            <button
              onClick={() => setOpponentType('online')}
              className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-all ${
                opponentType === 'online' 
                  ? 'bg-blue-100 border-blue-500 text-blue-900 ring-1 ring-blue-500' 
                  : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Otro jugador
            </button>
            <button
              onClick={() => setOpponentType('local')}
              className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-all ${
                opponentType === 'local' 
                  ? 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500' 
                  : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Local
            </button>
          </div>

          {opponentType === 'bot' ? (
            <div className="animate-in fade-in slide-in-from-top-2">
              <AIParamsSelector onChange={setBotConfig} />
            </div>
          ) : opponentType === 'online' ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="size-4" />
                Jugador blanco
              </label>
              <select
                value={selectedOpponentId}
                onChange={(event) => setSelectedOpponentId(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {opponents.length === 0 ? (
                  <option value="">No hay jugadores disponibles</option>
                ) : (
                  opponents.map((opponent) => (
                    <option key={opponent.id} value={opponent.id}>
                      {opponent.full_name || opponent.email}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div className="text-center p-8 bg-emerald-50 border border-dashed border-emerald-200 rounded-lg">
              <p className="text-emerald-800 font-medium">
                Modo local: jugarás ambos colores desde esta cuenta alternando turnos.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full h-12 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creando tablero...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5 fill-current" />
              Comenzar Juego
            </>
          )}
        </Button>

      </div>
    </div>
  )
}
