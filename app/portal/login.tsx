import { Redirect } from 'expo-router';

// O login agora é uma tela só (/login) para paciente, fisioterapeuta e admin.
// Esta rota continua existindo porque o endereço já foi enviado a pacientes por
// e-mail — apenas redireciona.
export default function PortalLoginRedirect() {
  return <Redirect href="/login" />;
}
