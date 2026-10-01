"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

// Campo de senha com botão para mostrar/ocultar o conteúdo digitado.
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return <span className="password-field">
    <input {...props} type={visible ? "text" : "password"}/>
    <button type="button" className="password-toggle" onClick={()=>setVisible(!visible)}
      aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} title={visible ? "Ocultar senha" : "Mostrar senha"}>
      {visible ? <EyeOff size={20} strokeWidth={1.75}/> : <Eye size={20} strokeWidth={1.75}/>}
    </button>
  </span>;
}
