const { Chess } = require('chess.js');

function makeMove(room, move){
  if(!room||!room.chess) return {ok:false,error:'Game not initialized'};
  const chess=room.chess;
  try{
    const m=chess.move(move);
    if(!m) return {ok:false,error:'Illegal move'};
    let reason=null,result=null;
    if(chess.game_over()){
      if(chess.in_checkmate()){ reason='checkmate'; result={winner:chess.turn()==='w'?'black':'white'}; }
      else if(chess.in_draw()||chess.in_stalemate()||chess.in_threefold_repetition()||chess.insufficient_material()){
        reason='draw'; result={winner:null};
      } else reason='game_over';
    }
    return {ok:true,move:m,reason,result};
  } catch(e){ return {ok:false,error:'Move failed'}; }
}

module.exports={makeMove};
