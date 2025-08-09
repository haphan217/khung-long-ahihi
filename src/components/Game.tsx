import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'

import eatSound from '../assets/eat.mp3'
import gameOverSound from '../assets/game-over.mp3'
import gameStartSound from '../assets/game-start.mp3'
import winSound from '../assets/high-score.mp3'
import jumpSound from '../assets/yay.mp3'
import { GameState, type HighScore } from '../types'
import GameOver, { LOCAL_STORAGE_KEY } from './GameOver'

const JUMP_DURATION = 800
const TAIL_WIDTH = 40
const HORN_WIDTH = 20

interface Props {
  happyLevel: number
  gameState: GameState
  setGameState: (gameState: GameState) => void
}

const audioInstances = {
  jump: new Audio(jumpSound),
  eat: new Audio(eatSound),
  gameOver: new Audio(gameOverSound),
  gameStart: new Audio(gameStartSound),
  win: new Audio(winSound)
}

Object.values(audioInstances).forEach((audio) => {
  audio.preload = 'auto'
})

const Game: React.FC<Props> = ({ happyLevel, gameState, setGameState }) => {
  const savedHighScore = localStorage.getItem(LOCAL_STORAGE_KEY)
  const [highScore, setHighScore] = useState<HighScore | null>(() =>
    savedHighScore ? JSON.parse(savedHighScore) : null
  )
  const [score, setScore] = useState(0)
  const isNewHighScore = score > (highScore?.score || 0)

  const isGameOver = gameState === GameState.GAME_OVER
  const isIdle = gameState === GameState.IDLE

  const playerRef = useRef<HTMLDivElement>(null)
  const obstacleRef = useRef<HTMLDivElement>(null)
  const collisionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const berryRef = useRef<HTMLDivElement>(null)
  const berryCollectedRef = useRef<boolean>(false)

  // Memoize jump function to prevent recreation
  const jump = useCallback(() => {
    const player = playerRef.current
    if (!player || player.classList.contains('jump')) return

    audioInstances.jump.currentTime = 0 // Reset audio for better responsiveness
    audioInstances.jump.play()
    player.classList.add('jump')

    setTimeout(() => {
      player?.classList.remove('jump')
    }, JUMP_DURATION)
  }, [])

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ') jump()
  }

  useEffect(() => {
    console.log({ happyLevel })
    if (happyLevel > 0.9) jump()
  }, [happyLevel])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const isCollided = useCallback(() => {
    const playerClientRect = playerRef.current?.getBoundingClientRect()
    const obstacleClientRect = obstacleRef.current?.getBoundingClientRect()
    if (!playerClientRect || !obstacleClientRect) return false

    const { left: playerL, right: playerR, bottom: playerB } = playerClientRect
    const { left: obstacleL, right: obstacleR, top: obstacleT } = obstacleClientRect

    const xCollision = obstacleR - TAIL_WIDTH > playerL && obstacleL < playerR - HORN_WIDTH
    const yCollision = playerB > obstacleT

    return xCollision && yCollision
  }, [])

  const checkBerryCollision = useCallback(() => {
    if (berryCollectedRef.current) return

    const playerClientRect = playerRef.current?.getBoundingClientRect()
    const berryClientRect = berryRef.current?.getBoundingClientRect()
    if (!playerClientRect || !berryClientRect) return

    const { left: playerL, right: playerR, top: playerT, bottom: playerB } = playerClientRect
    const { left: berryL, right: berryR, top: berryT, bottom: berryB } = berryClientRect

    // Check collision
    const xCollision = berryR > playerL && berryL < playerR
    const yCollision = berryB > playerT && berryT < playerB

    if (xCollision && yCollision) {
      audioInstances.eat.currentTime = 0
      audioInstances.eat.play()
      setScore((prev) => prev + 10)
      berryCollectedRef.current = true
      berryRef.current?.classList.add('collected')

      setTimeout(() => {
        berryCollectedRef.current = false
        const berry = berryRef.current
        if (berry) {
          berry.classList.remove('collected')
          berry.style.animation = 'none'
          void berry.offsetWidth // Force reflow
          berry.style.animation = 'move 3s linear infinite'
          berry.style.animationDelay = `${Math.random() * 1000}ms`
        }
      }, 3000)
    }
  }, [])

  useEffect(() => {
    if (isGameOver || isIdle) {
      if (collisionIntervalRef.current) {
        clearInterval(collisionIntervalRef.current)
        collisionIntervalRef.current = null
      }

      if (isGameOver && isNewHighScore) {
        setTimeout(() => audioInstances.win.play(), 1000)
      }
      return
    }

    collisionIntervalRef.current = setInterval(() => {
      if (isCollided()) {
        audioInstances.gameOver.currentTime = 0
        audioInstances.gameOver.play().catch(() => {})
        setGameState(GameState.GAME_OVER)
        berryRef.current?.classList.add('collected')
      }
      checkBerryCollision()
    }, 100)

    return () => {
      if (collisionIntervalRef.current) {
        clearInterval(collisionIntervalRef.current)
        collisionIntervalRef.current = null
      }
    }
  }, [gameState])

  const handleReset = useCallback(
    (highScore?: HighScore) => {
      if (highScore) setHighScore(highScore)

      audioInstances.gameStart.currentTime = 0
      audioInstances.gameStart.play().catch(() => {})
      setGameState(GameState.PLAYING)
      setScore(0)
      berryCollectedRef.current = false
      berryRef.current?.classList.remove('collected')

      // Reset obstacle animation
      const obstacle = obstacleRef.current
      if (obstacle) {
        obstacle.style.animation = 'none'
        void obstacle.offsetWidth // Force reflow
        obstacle.style.animation = 'obstacle-move 6s linear infinite'
      }
    },
    [setGameState]
  )

  const handleStartGame = useCallback(() => {
    audioInstances.gameStart.currentTime = 0
    audioInstances.gameStart.play().catch(() => {})
    setGameState(GameState.PLAYING)
  }, [setGameState])

  return (
    <div
      className='game-container'
      style={{
        animationPlayState: isGameOver ? 'paused' : 'running'
      }}
    >
      {highScore && (
        <div className='score-card'>
          <div className='trophy' />
          <div style={{ paddingTop: 10 }}>
            {highScore.score} ( {highScore.name} )
          </div>
        </div>
      )}
      <div className='score-card'>
        <div className='berry-small' />
        <div style={{ paddingTop: 10 }}>{score}</div>
      </div>

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

      <div
        ref={berryRef}
        className='berry'
        style={{
          animationPlayState: gameState === GameState.PLAYING ? 'running' : 'paused'
        }}
      />

      {isGameOver && <GameOver onReset={handleReset} newHighScore={isNewHighScore ? score : undefined} />}

      {isIdle && (
        <div className='mask'>
          <button onClick={handleStartGame}>START</button>
        </div>
      )}
    </div>
  )
}

export default Game
