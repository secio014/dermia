// Celular brasileiro: DDD (2 díg.) + 9 + 8 dígitos = 11 no total.
// Exibição no padrão "11 9 5324-4847". Guardado no banco só com os dígitos.

/** Aplica a máscara progressivamente enquanto o usuário digita. */
export function mascararTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  const partes: string[] = [];
  if (d.length > 0) partes.push(d.slice(0, 2)); // DDD
  if (d.length >= 3) partes.push(d.slice(2, 3)); // 9
  if (d.length >= 4) {
    const meio = d.slice(3, 7);
    const fim = d.slice(7, 11);
    partes.push(fim ? `${meio}-${fim}` : meio);
  }
  return partes.join(' ');
}

/** Só os dígitos (11 quando completo). Vazio se não houver nada. */
export function telefoneDigitos(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11);
}

/** Válido = 11 dígitos e o terceiro é 9 (celular). */
export function telefoneValido(v: string): boolean {
  const d = telefoneDigitos(v);
  return d.length === 11 && d[2] === '9';
}

/** Reexibe um número já guardado (dígitos) no padrão "11 9 5324-4847". */
export function exibirTelefone(digitos: string | null | undefined): string {
  return digitos ? mascararTelefone(digitos) : '';
}
