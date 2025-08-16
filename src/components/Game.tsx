import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'

import backgroundSound from '../assets/background.mp3'
import eatSound from '../assets/eat.mp3'
import gameOverSound from '../assets/game-over.mp3'
import winSound from '../assets/high-score.mp3'
import jumpSound from '../assets/yay.mp3'
import ouchSound from '../assets/game-over-1.mp3'
import clapSound from '../assets/high-score-2.mp3'
import letsGoSound from '../assets/lets-go.mp3'
import { GameState, type HighScore, type PlayerScore } from '../types'
import GameOver, { LOCAL_STORAGE_KEY } from './GameOver'

const JUMP_DURATION = 1200
const TAIL_WIDTH = 65
const HORN_WIDTH = 65

const SPEED_SLOW = 7

interface Props {
  isHappy: boolean
  gameState: GameState
  setGameState: (gameState: GameState) => void
  highScore: HighScore
  setHighScore: (highScore: HighScore) => void
}

const audioInstances = {
  jump: new Audio(jumpSound),
  eat: new Audio(eatSound),
  gameOver: new Audio(gameOverSound),
  win: new Audio(winSound),
  background: new Audio(backgroundSound),
  ouch: new Audio(ouchSound),
  clap: new Audio(clapSound),
  letsGo: new Audio(letsGoSound)
}

Object.values(audioInstances).forEach((audio) => {
  audio.preload = 'auto'
})

const Game: React.FC<Props> = ({ isHappy, gameState, setGameState, highScore, setHighScore }) => {
  const [score, setScore] = useState(0)
  const isNewHighScore = score > 0 && (highScore.length < 5 || score > Math.min(...highScore.map((hs) => hs.score)))

  const isGameOver = gameState === GameState.GAME_OVER
  const isIdle = gameState === GameState.IDLE

  const playerRef = useRef<HTMLDivElement>(null)
  const obstacleRef = useRef<HTMLDivElement>(null)
  const collisionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const berryRef = useRef<HTMLDivElement>(null)
  const berryCollectedRef = useRef<boolean>(false)

  const [showHelp, setShowHelp] = useState(true)

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
    console.log({ isHappy })
    if (isHappy) jump()
  }, [isHappy])

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
        setTimeout(async () => {
          await audioInstances.win.play()
          audioInstances.clap.play()
        }, 1000)
      }
      return
    }

    collisionIntervalRef.current = setInterval(() => {
      if (isCollided()) {
        audioInstances.gameOver.currentTime = 0
        audioInstances.ouch.play().then(() => {
          setTimeout(() => {
            audioInstances.gameOver.play().catch(() => {})
          }, 500)
        })
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

  // useEffect(() => {
  //   if (score !== 10) return

  //   const obstacle = obstacleRef.current
  //   if (obstacle) obstacle.style.animation = `obstacle-move ${SPEED_FAST}s linear infinite 2s`
  // }, [score])

  const handleReset = useCallback(
    (newHighScore?: PlayerScore) => {
      if (newHighScore) {
        // Add new score to leaderboard and sort by score (descending)
        const updatedLeaderboard = [...highScore, newHighScore].sort((a, b) => b.score - a.score).slice(0, 5) // Keep only top 5
        setHighScore(updatedLeaderboard)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLeaderboard))
      }

      audioInstances.letsGo.currentTime = 0
      audioInstances.letsGo.play()
      setGameState(GameState.PLAYING)
      setScore(0)
      berryCollectedRef.current = false
      berryRef.current?.classList.remove('collected')

      const obstacle = obstacleRef.current
      if (obstacle) {
        obstacle.style.animation = 'none'
        void obstacle.offsetWidth // Force reflow
        obstacle.style.animation = `obstacle-move ${SPEED_SLOW}s linear infinite 13s`
      }
    },
    [setGameState, highScore]
  )

  const handleStartGame = useCallback(() => {
    audioInstances.letsGo.currentTime = 0
    audioInstances.letsGo.play()
    setGameState(GameState.PLAYING)
    setShowHelp(false)

    // play background music if not playing
    if (audioInstances.background.currentTime === 0) {
      audioInstances.background.play().catch(() => {})
      audioInstances.background.loop = true
    }
  }, [setGameState])

  return (
    <div
      className='game-container'
      style={
        {
          animationPlayState: isGameOver ? 'paused' : 'running',
          '--speed': SPEED_SLOW + 's'
        } as React.CSSProperties
      }
    >
      {highScore.length > 0 && (
        <div className='score-card'>
          <div className='trophy' />
          <div style={{ paddingTop: 10 }}>
            {highScore[0].score} ( {highScore[0].name} )
          </div>
        </div>
      )}
      <div className='score-card'>
        <div className='berry-small' />
        <div style={{ paddingTop: 10 }}>{score}</div>
      </div>

      <div className='help' onClick={() => setShowHelp((prev) => !prev)} />

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

      {showHelp && (
        <div className='help-modal'>
          Bạn hãy cười thật tươi để giúp chú khủng long nhảy qua chướng ngại vật và ăn trái cây nhé!
        </div>
      )}
    </div>
  )
}

export default Game
