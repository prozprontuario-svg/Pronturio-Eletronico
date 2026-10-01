"use client";
import { useEffect, useRef, useState } from "react";
import { Ribbon } from "lucide-react";

// Banner oficial: foto em public/setembro/voce-nao-esta-sozinho.(jpg|png|webp), verificada no servidor.
// Sem o arquivo, um banner equivalente em texto ocupa o mesmo espaço.
const tips = [
  { title:"Escute sem julgar", text:"Às vezes, o que uma pessoa mais precisa é ser ouvida. Ofereça atenção, respeito e espaço para que ela possa falar." },
  { title:"Esteja presente", text:"Uma mensagem, uma conversa ou simplesmente demonstrar preocupação pode fazer diferença em um momento difícil." },
  { title:"Incentive a busca por apoio", text:"Se perceber que alguém está enfrentando dificuldades, incentive a conversar com uma pessoa de confiança ou procurar ajuda profissional." },
];

export function SetembroAmarelo({ hero, onContinue }: { hero: string; onContinue: () => void }) {
  const [heroMissing, setHeroMissing] = useState(!hero);
  const heroImg = useRef<HTMLImageElement>(null);
  // O erro de carregamento pode ocorrer antes da hidratação; nesse caso o onError não dispara.
  useEffect(() => { const img = heroImg.current; if (img?.complete && !img.naturalWidth) setHeroMissing(true); }, []);
  return <article className="setembro" aria-labelledby="setembro-title">
    {heroMissing
      ? <div className="setembro-hero setembro-hero-fallback" role="img" aria-label="Você não está sozinho">
          <span>você não está sozinho</span><Ribbon size={56} strokeWidth={1.75} aria-hidden/></div>
      : <img ref={heroImg} className="setembro-hero" src={hero} alt="Duas mãos se apoiando, com o laço do Setembro Amarelo e a frase: você não está sozinho"
          onError={()=>setHeroMissing(true)}/>}
    <div className="setembro-body">
      <h1 id="setembro-title">Você não precisa enfrentar tudo sozinho</h1>
      <p className="setembro-lead">Pedir ajuda é uma atitude importante. Conversar com alguém de confiança, como familiares, amigos,
        professores ou profissionais de saúde, pode ajudar a encontrar apoio para enfrentar momentos difíceis.</p>
      <ul className="setembro-tips">
        {tips.map((tip)=><li key={tip.title}><h2>{tip.title}</h2><p>{tip.text}</p></li>)}
      </ul>
      <button type="button" className="btn btn-primary setembro-continue" onClick={onContinue}>Continuar para o Início</button>
    </div>
  </article>;
}
