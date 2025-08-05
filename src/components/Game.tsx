import { useEffect, useRef, useState } from 'react'

import { GameState } from '../types'
import classNames from 'classnames'

const JUMP_DURATION = 800

const tailWidth = 40
const hornWidth = 20

interface Props {
  happyLevel: number
  gameState: GameState
  setGameState: (gameState: GameState) => void
}

const Game: React.FC<Props> = ({ happyLevel, gameState, setGameState }) => {
  const [score, setScore] = useState(0)
  const isGameOver = gameState === GameState.GAME_OVER
  const isIdle = gameState === GameState.IDLE

  const playerRef = useRef<HTMLDivElement>(null)
  const obstacleRef = useRef<HTMLDivElement>(null)
  const collisionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const jump = () => {
    const player = playerRef.current
    if (player && !player.classList.contains('jump')) {
      player.classList.add('jump')
    }

    setTimeout(() => {
      player?.classList.remove('jump')
    }, JUMP_DURATION)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ') jump()
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const isCollided = () => {
    const playerClientRect = playerRef.current?.getBoundingClientRect()
    const obstacleClientRect = obstacleRef.current?.getBoundingClientRect()
    if (!playerClientRect || !obstacleClientRect) return false

    const { left: playerL, right: playerR, bottom: playerB } = playerClientRect
    const { left: obstacleL, right: obstacleR, top: obstacleT } = obstacleClientRect

    const xCollision = obstacleR - tailWidth > playerL && obstacleL < playerR - hornWidth
    const yCollision = playerB > obstacleT

    return xCollision && yCollision
  }

  useEffect(() => {
    if (isGameOver || isIdle) {
      clearInterval(collisionIntervalRef.current!)
      return
    }

    collisionIntervalRef.current = setInterval(() => {
      if (isCollided()) {
        setGameState(GameState.GAME_OVER)
      }
    }, 100)

    return () => {
      if (collisionIntervalRef.current) {
        clearInterval(collisionIntervalRef.current)
      }
    }
  }, [gameState])

  const restart = () => {
    setGameState(GameState.PLAYING)
    setScore(0)
    obstacleRef.current!.style.animation = 'none'
    void obstacleRef.current!.offsetWidth
    obstacleRef.current!.style.animation = 'move 3s linear infinite'
  }

  return (
    <div
      className='game-container'
      style={{
        animationPlayState: isGameOver ? 'paused' : 'running'
      }}
    >
      <div className='score-card'>Score: {score}</div>
      <div
        ref={playerRef}
        className={classNames('player', isGameOver && 'stop')}
        style={{
          animationDuration: `${JUMP_DURATION}ms`
        }}
      />

      <div
        ref={obstacleRef}
        className='obstacle'
        style={{
          animationPlayState: gameState === GameState.PLAYING ? 'running' : 'paused'
        }}
      />

      {isGameOver && (
        <div className='restart-game mask'>
          <button onClick={restart}>RESTART</button>
        </div>
      )}

      {isIdle && (
        <div className='mask'>
          <button onClick={() => setGameState(GameState.PLAYING)}>START</button>
        </div>
      )}
    </div>
  )
}

export default Game
