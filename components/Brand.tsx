import Image from "next/image";

// Logo oficial (2172 × 724). Único ponto de uso da marca: não recolorir nem distorcer.
export function Brand({ height = 55, priority = false }: { height?: number; priority?: boolean }) {
  return <Image className="brand-logo" src="/brand/proz-saude.png" alt="Proz Saúde"
    width={Math.round(height * 3)} height={height} style={{width:Math.round(height * 3),height,maxWidth:"100%"}}
    priority={priority} unoptimized/>;
}
