import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Política de Privacidade — Trovaa",
  description: "Política de privacidade do Trovaa.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Política de Privacidade" updatedAt="13 de julho de 2026">
      <p>
        Esta Política de Privacidade descreve como o Trovaa coleta, usa e protege
        seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
        (LGPD — Lei nº 13.709/2018).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Cadastro:</strong> e-mail, senha (armazenada de forma criptografada)
          e nome de usuário escolhido por você.
        </li>
        <li>
          <strong>Uso do chat:</strong> mensagens enviadas nas salas, data/hora e
          estado da sala em que você participa.
        </li>
        <li>
          <strong>Registros de acesso ao chat:</strong> ao utilizar nosso chat,
          coletamos automaticamente as seguintes informações:
          <ul>
            <li>endereço de IP;</li>
            <li>horário do uso do chat;</li>
            <li>
              informações do dispositivo, como user-agent, resolução da tela e
              fuso horário (timezone).
            </li>
          </ul>
        </li>
        <li>
          <strong>Presença online:</strong> identificador anônimo temporário para
          exibir quantas pessoas estão online no site.
        </li>
        <li>
          <strong>Técnicos:</strong> dados de navegação necessários ao funcionamento
          (sessão, preferência de tema).
        </li>
      </ul>

      <h2>2. Finalidade do tratamento</h2>
      <p>Utilizamos seus dados para:</p>
      <ul>
        <li>Criar e autenticar sua conta;</li>
        <li>Exibir mensagens em tempo real nas salas de chat;</li>
        <li>Manter a segurança e o funcionamento da plataforma;</li>
        <li>Cumprir obrigações legais;</li>
        <li>Melhorar a experiência do usuário.</li>
      </ul>

      <h2>3. Base legal</h2>
      <p>
        O tratamento se baseia no seu consentimento (ao aceitar esta política no
        cadastro), na execução do contrato de uso do serviço, em legítimo interesse
        para segurança e operação da plataforma e no cumprimento de obrigação legal,
        inclusive a guarda de registros de acesso prevista na Lei nº 12.965/2014
        (Marco Civil da Internet).
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Seus dados são processados pelo Supabase (infraestrutura de banco de dados e
        autenticação). Não vendemos seus dados pessoais. Mensagens publicadas nas
        salas são visíveis para outros usuários autenticados da mesma sala.
      </p>

      <h2>5. Retenção</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário
        para cumprir obrigações legais. Mensagens podem ser mantidas no histórico
        das salas enquanto o serviço estiver em operação.
      </p>
      <p>
        Os registros de acesso ao chat (IP, horário de uso e informações do
        dispositivo) são armazenados por um período de 6 (seis) meses, conforme
        determinado pela Lei nº 12.965/2014 (Marco Civil da Internet), que
        estabelece a obrigatoriedade da guarda de registros de acesso a
        aplicações de Internet pelo respectivo provedor.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>Acessar e corrigir seus dados;</li>
        <li>Solicitar a exclusão da conta e dos dados associados;</li>
        <li>Revogar o consentimento, quando aplicável;</li>
        <li>Solicitar informações sobre o tratamento dos seus dados.</li>
      </ul>

      <h2>7. Cookies e armazenamento local</h2>
      <p>
        Utilizamos cookies de sessão para autenticação e armazenamento local para
        preferências (como tema escuro/claro). O contador de pessoas online usa um
        identificador anônimo salvo no seu navegador.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas como conexão criptografada (HTTPS) e controle de
        acesso ao banco de dados. Nenhum sistema é 100% seguro; use uma senha forte.
      </p>

      <h2>9. Menores de idade</h2>
      <p>
        O Trovaa não é destinado a menores de 13 anos. Se tomarmos conhecimento de
        cadastro de menor sem consentimento dos responsáveis, a conta poderá ser
        removida.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Esta política pode ser atualizada. A data da última revisão será indicada
        no topo da página.
      </p>

      <h2>11. Contato</h2>
      <p>
        Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre
        em contato pelo canal disponível no site.
      </p>
    </LegalDocument>
  );
}
