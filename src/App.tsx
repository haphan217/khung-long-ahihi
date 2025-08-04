import * as faceapi from 'face-api.js'
import { useEffect, useRef, useState } from 'react'

// Ball physics constants
const GRAVITY = 0.8
const JUMP_FORCE = 15
const GROUND_Y = 0
const GAME_SPEED = 3
const OBSTACLE_WIDTH = 20
const OBSTACLE_HEIGHT = 40
const videoHeight = 480
const videoWidth = 640
const BALL_SIZE = 30
const GAME_WIDTH = 400
const GAME_HEIGHT = 200

type Obstacle = {
  id: number
  x: number
  width: number
  height: number
}

const App = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const [happyLevel, setHappyLevel] = useState(0)
  const fixedHappyLevel = Number(happyLevel.toFixed(3))

  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)

  // Ball physics
  const [ballPosition, setBallPosition] = useState(0)
  const [ballVelocity, setBallVelocity] = useState(0)
  const [isJumping, setIsJumping] = useState(false)

  // Game elements
  const [groundOffset, setGroundOffset] = useState(0)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const gameLoopRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]).then(() => setModelsLoaded(true))
    }
    loadModels()
  }, [])

  const animateBall = () => {
    setBallPosition((prevPosition) => {
      const newPosition = prevPosition + ballVelocity

      // Check if ball hits ground
      if (newPosition <= GROUND_Y) {
        setBallVelocity(0)
        setIsJumping(false)
        return GROUND_Y
      }

      return newPosition
    })

    setBallVelocity((prevVelocity) => prevVelocity - GRAVITY)
  }

  // Ball animation loop
  useEffect(() => {
    if (isJumping && !gameOver) {
      animationRef.current = requestAnimationFrame(animateBall)
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isJumping, ballVelocity, gameOver])

  const gameLoop = () => {
    // Move ground
    setGroundOffset((prev) => (prev - GAME_SPEED) % 50)

    // Move obstacles
    setObstacles((prev) =>
      prev
        .map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - GAME_SPEED
        }))
        .filter((obstacle) => obstacle.x > -obstacle.width)
    )

    // Generate new obstacles
    if (Math.random() < 0.008 && obstacles.length < 2) {
      // 2% chance each frame
      setObstacles((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          x: GAME_WIDTH,
          width: OBSTACLE_WIDTH,
          height: OBSTACLE_HEIGHT
        }
      ])
    }

    // Update score
    // setScore((prev) => prev + 1)

    // Check collision
    const ballLeft = 50
    const ballRight = ballLeft + BALL_SIZE
    const ballTop = GAME_HEIGHT - ballPosition - BALL_SIZE
    const ballBottom = GAME_HEIGHT - ballPosition

    obstacles.forEach((obstacle) => {
      const obstacleLeft = obstacle.x
      const obstacleRight = obstacle.x + obstacle.width
      const obstacleTop = GAME_HEIGHT - obstacle.height
      const obstacleBottom = GAME_HEIGHT

      // Check collision
      if (
        ballRight > obstacleLeft &&
        ballLeft < obstacleRight &&
        ballBottom > obstacleTop &&
        ballTop < obstacleBottom
      ) {
        handleGameOver()
      }
    })

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }

  // Game loop for moving ground and obstacles
  useEffect(() => {
    if (!gameStarted) return

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [obstacles, ballPosition, gameStarted])

  // Handle jump when happy level is high
  useEffect(() => {
    if (fixedHappyLevel > 0.9 && !isJumping && !gameOver) {
      setBallVelocity(JUMP_FORCE)
      setIsJumping(true)
    }
  }, [fixedHappyLevel, isJumping, gameOver])

  const handleGameOver = () => {
    setGameOver(true)
    setHappyLevel(0)
    setGameStarted(false)
    setIsJumping(false)
    setBallVelocity(0)
    setBallPosition(0)
    closeWebcam()

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const startVideo = async () => {
    setHappyLevel(0)
    setGameStarted(true)
    setGameOver(false)

    setScore(0)
    setObstacles([])
    setGroundOffset(0)

    navigator.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
      .catch((err) => {
        console.error('error:', err)
      })
  }

  const handleVideoOnPlay = () => {
    if (gameOver) return

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return

      canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(videoRef.current)
      faceapi.matchDimensions(canvasRef.current, {
        width: videoWidth,
        height: videoHeight
      })

      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions()
      if (!detections) return

      const resized = faceapi.resizeResults(detections, {
        width: videoWidth,
        height: videoHeight
      })

      const detection = detections?.expressions.asSortedArray()[0]
      console.log('happy', detection, detections.expressions)
      if (resized && detection?.expression === 'happy') {
        setHappyLevel(detection.probability)
        faceapi.draw.drawDetections(canvasRef.current, resized)
        faceapi.draw.drawFaceExpressions(canvasRef.current, resized)
      } else setHappyLevel(0)
    }, 200)
  }

  const closeWebcam = () => {
    if (!videoRef.current) return

    videoRef.current.pause()
    ;(videoRef.current.srcObject as MediaStream).getTracks()[0].stop()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw'
      }}
    >
      {!gameStarted && !gameOver && (
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <button
            onClick={startVideo}
            style={{
              cursor: 'pointer',
              backgroundColor: 'green',
              color: 'white',
              padding: '15px',
              fontSize: '25px',
              border: 'none',
              borderRadius: '10px'
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {modelsLoaded && gameStarted && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
            <video
              ref={videoRef}
              height={videoHeight}
              width={videoWidth}
              onPlay={handleVideoOnPlay}
              style={{ borderRadius: '10px' }}
            />
            <canvas ref={canvasRef} style={{ position: 'absolute' }} />
          </div>
        </div>
      )}

      <div>
        <div>Happy Level: {fixedHappyLevel}</div>
        <div>Score: {score}</div>
      </div>

      {/* Game area */}
      <div
        style={{
          width: '400px',
          height: '200px',
          border: '2px solid #333',
          position: 'relative',
          backgroundColor: '#f0f0f0',
          overflow: 'hidden'
        }}
      >
        {/* Moving ground */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            width: 'calc(100% + 40px)',
            height: '5px',
            backgroundColor: '#8B4513',
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 20px,
              #654321 20px,
              #654321 40px
            )`,
            transform: `translateX(${groundOffset}px)`
          }}
        />

        {/* Obstacles */}
        {obstacles.map((obstacle) => (
          <div
            key={obstacle.id}
            style={{
              position: 'absolute',
              left: `${obstacle.x}px`,
              bottom: '5px',
              width: `${obstacle.width}px`,
              height: `${obstacle.height}px`,
              backgroundColor: '#8B0000',
              border: '2px solid #660000'
            }}
          />
        ))}

        {/* Bouncing ball */}
        <div
          style={{
            width: BALL_SIZE,
            height: BALL_SIZE,
            borderRadius: '50%',
            backgroundColor: 'red',
            position: 'absolute',
            bottom: `${ballPosition + 5}px`,
            left: '50px',
            transition: 'none'
          }}
        />
      </div>

      {gameOver && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            zIndex: 1000
          }}
        >
          <h2>Game Over!</h2>
          <p>Score: {score}</p>
          <button
            onClick={startVideo}
            style={{
              backgroundColor: 'green',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Play Again
          </button>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        Smile to make the ball jump! Avoid the obstacles!
      </div>
    </div>
  )
}

export default App
