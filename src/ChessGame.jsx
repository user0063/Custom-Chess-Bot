// import { useState, useCallback } from "react";
// import { Chessboard } from "react-chessboard";
// import { Chess } from "chess.js";

// const ChessGame = () => {
//   const [game, setGame] = useState(new Chess());
//   const [moveLog, setMoveLog] = useState([]);
//   const [isCustomSetup, setIsCustomSetup] = useState(true); // Track setup mode

//   const onDrop = useCallback(
//     (sourceSquare, targetSquare, piece) => {
//       if (isCustomSetup) {
//         const newGame = new Chess(game.fen());
//         newGame.remove(sourceSquare);
//         newGame.put(
//           { type: piece[1].toLowerCase(), color: piece[0] === "w" ? "w" : "b" },
//           targetSquare
//         );
//         setGame(newGame);
//         return true;
//       }

//       // Normal move logic
//       try {
//         const move = game.move({
//           from: sourceSquare,
//           to: targetSquare,
//           promotion: "q",
//         });

//         if (move) {
//           setGame(new Chess(game.fen()));
//           const moveNotation = `${game.turn() === "w" ? "Black" : "White"}: ${
//             move.san
//           }`;
//           setMoveLog((prev) => [...prev, moveNotation]);
//           return true;
//         }
//       } catch (error) {
//         return false;
//       }

//       return false;
//     },
//     [game, isCustomSetup]
//   );

//   const resetGame = () => {
//     setGame(new Chess());
//     setMoveLog([]);
//   };

//   const getGameStatus = () => {
//     if (game.isGameOver()) {
//       if (game.isCheckmate()) return "Checkmate!";
//       if (game.isDraw()) return "Draw!";
//       if (game.isStalemate()) return "Stalemate!";
//       return "Game Over!";
//     }
//     if (game.inCheck()) return "Check!";
//     return `${game.turn() === "w" ? "White" : "Black"} to move`;
//   };

//   const containerStyle = {
//     maxWidth: "1200px",
//     margin: "0 auto",
//     padding: "20px",
//     display: "flex",
//     gap: "20px",
//     flexDirection: window.innerWidth < 768 ? "column" : "row",
//   };

//   const boardContainerStyle = {
//     flex: 2,
//     maxWidth: "600px",
//   };

//   const moveLogStyle = {
//     flex: 1,
//     border: "1px solid #ccc",
//     borderRadius: "4px",
//     padding: "15px",
//   };

//   const moveListStyle = {
//     height: "400px",
//     overflowY: "auto",
//     border: "1px solid #eee",
//     padding: "10px",
//   };

//   const moveItemStyle = {
//     padding: "8px",
//     borderBottom: "1px solid #eee",
//     backgroundColor: "#fff",
//   };

//   const buttonStyle = {
//     padding: "8px 16px",
//     backgroundColor: "#2196f3",
//     color: "white",
//     border: "none",
//     borderRadius: "4px",
//     cursor: "pointer",
//     marginTop: "15px",
//   };

//   const statusStyle = {
//     fontSize: "20px",
//     marginBottom: "15px",
//     textAlign: "center",
//     color: game.inCheck() ? "#d32f2f" : "#333",
//   };

//   return (
//     <div style={containerStyle}>
//       <div style={boardContainerStyle}>
//         <div style={statusStyle}>{getGameStatus()}</div>
//         <Chessboard
//           position={game.fen()}
//           onPieceDrop={onDrop}
//           customBoardStyle={{
//             borderRadius: "4px",
//             boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
//           }}
//           customDarkSquareStyle={{ backgroundColor: "#779952" }}
//           customLightSquareStyle={{ backgroundColor: "#edeed1" }}
//         />
//         <button
//           onClick={() => setIsCustomSetup((prev) => !prev)}
//           style={buttonStyle}
//         >
//           {isCustomSetup ? "Switch to Play Mode" : "Switch to Setup Mode"}
//         </button>

//         <button
//           onClick={resetGame}
//           style={buttonStyle}
//           onMouseOver={(e) => (e.target.style.backgroundColor = "#1976d2")}
//           onMouseOut={(e) => (e.target.style.backgroundColor = "#2196f3")}
//         >
//           New Game
//         </button>
//       </div>

//       <div style={moveLogStyle}>
//         <h2 style={{ marginBottom: "15px", fontSize: "18px" }}>Move History</h2>
//         <div style={moveListStyle}>
//           {moveLog.length > 0 ? (
//             moveLog.map((move, index) => (
//               <div key={index} style={moveItemStyle}>
//                 {`${Math.floor(index / 2) + 1}. ${move}`}
//               </div>
//             ))
//           ) : (
//             <div
//               style={{
//                 textAlign: "center",
//                 color: "#666",
//                 fontStyle: "italic",
//               }}
//             >
//               No moves yet
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChessGame;

import React, { useState, useCallback, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
const stockfish = new Worker("/stockfish.js");

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [moveLog, setMoveLog] = useState([]);
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [moveCounts, setMoveCounts] = useState({ w: 0, b: 0 });
  const [scores, setScores] = useState({ w: 0, b: 0 });
  const [isGameOverCustom, setIsGameOverCustom] = useState(false);
  const [playerColor, setPlayerColor] = useState("w");

  const [botStrength, setBotStrength] = useState(20);

  useEffect(() => {
    stockfish.postMessage(`setoption name Skill Level value ${botStrength}`);
  }, [botStrength]);

  // Run bot move when it's bot's turn
  useEffect(() => {
    if (
      !isSetupMode &&
      isBotEnabled &&
      game.turn() !== playerColor &&
      !game.isGameOver()
    ) {
      stockfish.postMessage("position fen " + game.fen());
      stockfish.postMessage("go depth 10");

      stockfish.onmessage = (event) => {
        const line = event.data;
        if (line.startsWith("bestmove")) {
          const [, bestMove] = line.split(" ");
          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);

          const move = game.move({ from, to, promotion: "q" });
          if (move) {
            setGame(new Chess(game.fen()));
            const moveNotation = `Bot: ${move.san}`;
            setMoveLog((prev) => [...prev, moveNotation]);
          }
        }
      };
    }
  }, [game, isSetupMode, isBotEnabled]);

  const pieceValues = {
    q: 9,
    r: 5,
    b: 3,
    n: 3,
    p: 1,
  };
  function getBotBestScoringMove(fen) {
    const botGame = new Chess(fen);
    const moves = botGame.moves({ verbose: true });

    for (const move of moves) {
      const testGame = new Chess(fen);
      testGame.move({
        from: move.from,
        to: move.to,
        promotion: "q",
      });

      // 🔍 Try simulating up to 6 plies for a forced checkmate
      for (let depth = 0; depth < 1; depth++) {
        const line = testGame.moves({ verbose: true });
        let foundMate = false;

        for (const nextMove of line) {
          const previewGame = new Chess(testGame.fen());
          previewGame.move({
            from: nextMove.from,
            to: nextMove.to,
            promotion: "q",
          });

          if (previewGame.isCheckmate()) {
            foundMate = true;
            break;
          }
        }

        if (foundMate) {
          return move; // ✅ Return move that leads to checkmate
        }
      }
    }

    // 🪙 Fall back to capture-based scoring
    const scoredMoves = moves.map((move) => {
      const value = move.captured ? pieceValues[move.captured] || 0 : 0;
      return { move, score: value };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0]?.move;
  }

  const onDrop = useCallback(
    (sourceSquare, targetSquare, piece) => {
      if (isGameOverCustom) return false;

      const newGame = new Chess(game.fen());

      // 🧩 SETUP MODE — Custom Placement
      if (isSetupMode) {
        const type = piece[1].toLowerCase();
        const color = piece[0] === "w" ? "w" : "b";

        // ✅ Only remove if sourceSquare exists on board
        const sourcePiece = sourceSquare ? game.get(sourceSquare) : null;
        if (sourcePiece) {
          newGame.remove(sourceSquare);
        }

        // ✅ Remove anything on targetSquare before placing new piece
        newGame.remove(targetSquare);

        newGame.put({ type, color }, targetSquare);
        setGame(newGame);
        return true;
      }

      // 🕹️ PLAY MODE — Regular Move Handling
      const captured = newGame.get(targetSquare);
      try {
        const move = newGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        if (move) {
          const currentPlayer = move.color;
          const opponent = currentPlayer === "w" ? "b" : "w";

          const updatedMoveCounts = {
            ...moveCounts,
            [currentPlayer]: moveCounts[currentPlayer] + 1,
          };
          setMoveCounts(updatedMoveCounts);

          if (captured) {
            const score = pieceValues[captured.type] || 0;
            setScores((prev) => ({
              ...prev,
              [currentPlayer]: prev[currentPlayer] + score,
            }));
          }

          setGame(new Chess(newGame.fen()));
          setMoveLog((prev) => [
            ...prev,
            `${currentPlayer === "w" ? "White" : "Black"}: ${move.san}`,
          ]);

          const totalMovesReached =
            updatedMoveCounts.w >= 6 && updatedMoveCounts.b >= 6;
          const finalCheckmate = newGame.isCheckmate();

          if (finalCheckmate || totalMovesReached) {
            let result = "";
            if (finalCheckmate) {
              result = `${
                currentPlayer === "w" ? "White" : "Black"
              } wins by checkmate!`;
            } else if (scores.w > scores.b) {
              result = "White wins by score!";
            } else if (scores.b > scores.w) {
              result = "Black wins by score!";
            } else {
              result = "It’s a tie!";
            }
            alert(result);
            setIsGameOverCustom(true);
            return true;
          }

          // 🤖 Bot Move — capture-based strategy
          if (
            opponent === "b" &&
            isBotEnabled &&
            updatedMoveCounts.b < 6 &&
            !newGame.isGameOver()
          ) {
            setTimeout(() => {
              const botGame = new Chess(newGame.fen()); // ✅ DECLARED HERE

              const bestMove = getBotBestScoringMove(botGame.fen());

              if (bestMove) {
                const preCapture = botGame.get(bestMove.to);
                const botMove = botGame.move({
                  from: bestMove.from,
                  to: bestMove.to,
                  promotion: "q",
                });

                if (botMove) {
                  const captureScore = preCapture
                    ? pieceValues[preCapture.type] || 0
                    : 0;

                  setGame(new Chess(botGame.fen()));
                  setScores((prev) => ({
                    ...prev,
                    b: prev.b + captureScore,
                  }));
                  setMoveCounts((prev) => ({
                    ...prev,
                    b: prev.b + 1,
                  }));
                  setMoveLog((prev) => [...prev, `Bot: ${botMove.san}`]);

                  const botTotalReached =
                    moveCounts.w >= 6 && moveCounts.b + 1 >= 6;
                  const botCheckmate = botGame.isCheckmate();

                  if (botCheckmate || botTotalReached) {
                    let result = "";
                    if (botCheckmate) {
                      result = "Black wins by checkmate!";
                    } else if (scores.w > scores.b + captureScore) {
                      result = "White wins by score!";
                    } else if (scores.b + captureScore > scores.w) {
                      result = "Black wins by score!";
                    } else {
                      result = "It’s a tie!";
                    }
                    alert(result);
                    setIsGameOverCustom(true);
                  }
                }
              }
            }, 500);
          }

          return true;
        }
      } catch {
        return false;
      }

      return false;
    },
    [game, isSetupMode, isBotEnabled, moveCounts, scores, isGameOverCustom]
  );

  const resetGame = () => {
    setGame(new Chess()); // Standard starting position
    setMoveLog([]); // Clear move history
    setMoveCounts({ w: 0, b: 0 }); // Reset move counters
    setScores({ w: 0, b: 0 }); // Reset score totals
    setIsSetupMode(true); // Go back to Setup Mode
    setIsGameOverCustom(false); // Allow gameplay again
  };

  const clearBoard = () => {
    const emptyGame = new Chess();
    emptyGame.clear();

    // Re-add one white king and one black king
    emptyGame.put({ type: "k", color: "w" }, "e1");
    emptyGame.put({ type: "k", color: "b" }, "e8");

    setGame(emptyGame);
    setMoveLog([]);
    setMoveCounts({ w: 0, b: 0 });
    setScores({ w: 0, b: 0 });
    setIsSetupMode(true);
    setIsGameOverCustom(false);
  };

  const getGameStatus = () => {
    if (game.isGameOver()) {
      if (game.isCheckmate()) return "Checkmate!";
      if (game.isDraw()) return "Draw!";
      if (game.isStalemate()) return "Stalemate!";
      return "Game Over!";
    }
    if (game.inCheck()) return "Check!";
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  };

  // Styling (same as your original)
  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px 10px",
    display: "flex",
    gap: "10px",
    flexDirection: window.innerWidth < 768 ? "column" : "row",
  };

  const boardContainerStyle = { flex: 2, maxWidth: "600px" };
  const moveLogStyle = {
    flex: 1,
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "15px",
  };

  const moveListStyle = {
    height: "400px",
    overflowY: "auto",
    border: "1px solid #eee",
    padding: "10px",
  };

  const moveItemStyle = {
    padding: "8px",
    borderBottom: "1px solid #eee",
    backgroundColor: "#fff",
  };

  const buttonStyle = {
    padding: "8px 16px",
    backgroundColor: "#2196f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "15px",
  };

  const statusStyle = {
    fontSize: "16px",
    marginBottom: "2px",
    textAlign: "center",
    color: game.inCheck() ? "#d32f2f" : "#333",
  };

  return (
    <div style={containerStyle}>
      {/* Controls + Status */}

      {/* Piece Tray (visible only in Setup Mode) */}
      {isSetupMode && (
        <div style={{ textAlign: "center" }}>
          <Chessboard
            position={{
              a1: "wP",
              b1: "wN",
              c1: "wB",
              d1: "wR",
              e1: "wQ",
              f1: "wK",
              a2: "bP",
              b2: "bN",
              c2: "bB",
              d2: "bR",
              e2: "bQ",
              f2: "bK",
            }}
            boardWidth={300}
            arePiecesDraggable={true}
            onPieceDrop={(source, target, piece) => {
              if (!target) return false;
              const newGame = new Chess(game.fen());
              const color = piece[0] === "w" ? "w" : "b";
              const type = piece[1].toLowerCase();
              newGame.put({ type, color }, target);
              setGame(newGame);
              return true;
            }}
            customDarkSquareStyle={{ backgroundColor: "#eee" }}
            customLightSquareStyle={{ backgroundColor: "#fff" }}
            customBoardStyle={{
              margin: "0 auto",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />
        </div>
      )}
      <select
        value={playerColor}
        onChange={(e) => setPlayerColor(e.target.value)}
        style={{ fontSize: "12px", padding: "0px" }}
      >
        <option style={{ fontSize: "12px" }} value="w">
          Play as White
        </option>
        <option style={{ fontSize: "12px" }} value="b">
          Play as Black
        </option>
      </select>

      {/* Main Game Board */}
      <div style={boardContainerStyle}>
        <div style={statusStyle}>{getGameStatus()}</div>

        <Chessboard
          position={game.fen()}
          boardOrientation={playerColor === "w" ? "black" : "white"}
          onPieceDrop={onDrop}
          customBoardStyle={{
            borderRadius: "4px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
          }}
          customDarkSquareStyle={{ backgroundColor: "#779952" }}
          customLightSquareStyle={{ backgroundColor: "#edeed1" }}
          arePiecesDraggable={true}
          boardWidth={370}
        />

        {isSetupMode && (
          <div style={{ marginTop: "2px", textAlign: "center" }}>
            <h3 style={{ fontSize: "12px" }}>Piece Tray (Drag onto board)</h3>
            <Chessboard
              position={{
                a8: "wP",
                b8: "wN",
                c8: "wB",
                d8: "wR",
                e8: "wQ",
                f8: "wK",
                a7: "bP",
                b7: "bN",
                c7: "bB",
                d7: "bR",
                e7: "bQ",
                f7: "bK",
              }}
              boardWidth={300}
              arePiecesDraggable={true}
              onPieceDrop={(source, target, piece) => {
                if (!target) return false;
                const newGame = new Chess(game.fen());
                const color = piece[0] === "w" ? "w" : "b";
                const type = piece[1].toLowerCase();
                newGame.put({ type, color }, target);
                setGame(newGame);
                return true;
              }}
              customDarkSquareStyle={{ backgroundColor: "#eee" }}
              customLightSquareStyle={{ backgroundColor: "#fff" }}
              customBoardStyle={{
                margin: "0 auto",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>
        )}

        {/* Setup & Reset Buttons */}
        <button
          onClick={() => setIsSetupMode((prev) => !prev)}
          style={buttonStyle}
        >
          {isSetupMode ? "Switch to Play Mode" : "Switch to Setup Mode"}
        </button>

        <button onClick={resetGame} style={buttonStyle}>
          Reset to Standard Game
        </button>

        <button onClick={clearBoard} style={buttonStyle}>
          Clear Board for Setup
        </button>
      </div>

      {/* Move History Panel */}
      <div style={moveLogStyle}>
        <h2 style={{ marginBottom: "15px", fontSize: "18px" }}>Move History</h2>
        <div style={moveListStyle}>
          {moveLog.length > 0 ? (
            moveLog.map((move, index) => (
              <div key={index} style={moveItemStyle}>
                {`${Math.floor(index / 2) + 1}. ${move}`}
              </div>
            ))
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                fontStyle: "italic",
              }}
            >
              No moves yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessGame;
