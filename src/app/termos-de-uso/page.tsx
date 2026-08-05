import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Termos de Uso — Trovaa",
  description: "Termos de uso do Trovaa.",
};

export default function TermsPage() {
  return (
    <LegalDocument title="Termos de Uso" updatedAt="3 de julho de 2026">
      <p>
        Bem-vindo ao Trovaa. Ao criar uma conta ou utilizar nossa plataforma de
        bate-papo em tempo real, você concorda com estes Termos de Uso.
      </p>

      <h2>1. Sobre o serviço</h2>
      <p>
        O Trovaa é uma plataforma que permite conversas em tempo real organizadas
        por estado do Brasil. O serviço é oferecido &quot;como está&quot;, em evolução
        contínua.
      </p>

      <h2>2. Cadastro e conta</h2>
      <ul>
        <li>Você deve fornecer informações verdadeiras no cadastro.</li>
        <li>É sua responsabilidade manter a confidencialidade da sua senha.</li>
        <li>Você é responsável por toda atividade realizada na sua conta.</li>
        <li>É proibido criar contas falsas ou se passar por outra pessoa.</li>
      </ul>

      <h2>3. Conduta do usuário</h2>
      <p>Ao usar o Trovaa, você concorda em não:</p>
      <ul>
        <li>Publicar conteúdo ilegal, ofensivo, discriminatório ou ameaçador;</li>
        <li>Assediar, perseguir ou intimidar outros usuários;</li>
        <li>Enviar spam, propaganda não autorizada ou links maliciosos;</li>
        <li>Tentar acessar áreas restritas ou interferir no funcionamento do site;</li>
        <li>Coletar dados de outros usuários sem autorização.</li>
      </ul>

      <h2>4. Conteúdo das mensagens</h2>
      <p>
        Você é o único responsável pelo conteúdo que publica nas salas de chat.
        Reservamo-nos o direito de remover conteúdo e suspender contas que violem
        estes termos ou a legislação aplicável.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        A marca Trovaa, o logotipo e os elementos visuais da plataforma são de
        nossa propriedade. O conteúdo que você publica continua sendo seu, mas você
        nos concede licença para exibi-lo na plataforma enquanto necessário para
        operar o serviço.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        O Trovaa não se responsabiliza por opiniões ou conteúdos publicados por
        usuários, nem por danos decorrentes do uso da plataforma, na extensão
        permitida pela lei.
      </p>

      <h2>7. Encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes termos. Você pode
        deixar de usar o serviço a qualquer momento.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Estes termos podem ser atualizados. Em caso de mudanças relevantes,
        informaremos na plataforma. O uso continuado após a atualização implica
        aceite da nova versão.
      </p>

      <h2>9. Contato</h2>
      <p>
        Dúvidas sobre estes termos podem ser enviadas pelo canal de contato
        disponível no site.
      </p>
    </LegalDocument>
  );
}
