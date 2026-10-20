/**
 * THE WEB LEGENDS OF UCSAL
 * Script principal do jogo - Lógica de narrativa, áudio Web Audio API e sistema de batalha RPG.
 * Desenvolvido originalmente por Maria Luiza, Samuel e Thais.
 */

// ============================================================================
// 1. SISTEMA DE ÁUDIO (Web Audio API & Música)
// ============================================================================
let audioCtx = null;
let somHabilitado = false; // Começa desativado para respeitar autoplay policies
let musicaAtual = null;

const SONS = {
  bgm: "music/Amizades Virtuais [music].mp3",
  battle: "music/battle.mp3"
};

function obterAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function alternarAudio() {
  somHabilitado = !somHabilitado;
  const botao = document.getElementById("botao-audio");
  
  if (somHabilitado) {
    obterAudioContext();
    if (botao) {
      botao.textContent = "🔊";
      botao.title = "Desativar Som";
    }
    // Retomar música se houver uma tocando
    if (musicaAtual) musicaAtual.play();
    else tocarMusica(SONS.bgm); // Toca música padrão se nada estiver tocando
    
    tocarBeep(523.25, 0.1, "sine");
  } else {
    if (botao) {
      botao.textContent = "🔇";
      botao.title = "Ativar Som";
    }
    if (musicaAtual) musicaAtual.pause();
  }
}

function tocarMusica(caminho, loop = true) {
  if (musicaAtual) {
    musicaAtual.pause();
    musicaAtual = null;
  }
  
  musicaAtual = new Audio(caminho);
  musicaAtual.loop = loop;
  musicaAtual.volume = 0.4;
  
  if (somHabilitado) {
    musicaAtual.play().catch(e => console.warn("Erro ao tocar música:", e));
  }
}

function tocarBeep(frequencia = 440, duracao = 0.08, tipo = "sine", volume = 0.1) {
  if (!somHabilitado) return;
  try {
    const ctx = obterAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tipo;
    osc.frequency.setValueAtTime(frequencia, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracao);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duracao);
  } catch (e) {
    console.warn("Erro ao sintetizar áudio:", e);
  }
}

function tocarSomTexto() {
  if (!somHabilitado) return;
  // Bip sutil com frequência levemente variada para efeito retrô orgânico
  const freq = 380 + Math.random() * 80;
  tocarBeep(freq, 0.03, "triangle", 0.03);
}

function tocarSomAtaque() {
  if (!somHabilitado) return;
  try {
    const ctx = obterAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

function tocarSomDano() {
  if (!somHabilitado) return;
  try {
    const ctx = obterAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

function tocarSomCura() {
  if (!somHabilitado) return;
  const notas = [261.63, 329.63, 392.00, 523.25]; // Acorde Dó Maior
  notas.forEach((n, idx) => {
    setTimeout(() => tocarBeep(n, 0.12, "sine", 0.1), idx * 60);
  });
}

function tocarSomVitoria() {
  if (!somHabilitado) return;
  const notas = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
  notas.forEach((n, idx) => {
    setTimeout(() => tocarBeep(n, 0.2, "triangle", 0.15), idx * 100);
  });
}

function tocarSomDerrota() {
  if (!somHabilitado) return;
  const notas = [392.00, 369.99, 349.23, 311.13, 261.63];
  notas.forEach((n, idx) => {
    setTimeout(() => tocarBeep(n, 0.25, "sawtooth", 0.12), idx * 120);
  });
}

// ============================================================================
// 2. ESTADO GLOBAL DO JOGO
// ============================================================================
let nomeJogador = "Estudante";
let dialogoEmAndamento = false;
let estaDigitando = false;
let textoCompletoAtual = "";
let elementoTextoAtual = null;
let callbackAposTextoAtual = null;
let intervaloDigitacao = null;

// Avatares dos personagens
const AVATARES = {
  seguranca: "img/seguranca(npc1).png",
  coordenador: "img/osbaldo(npc2).png",
  janete: "img/janeteimagem.png",
  marcio: "img/marcio(npc4).png",
  magoWeb: "img/MAGO DA WEB(npc4).png",
  jogador: "img/cenario1.png" // placeholder ou ícone
};

// ============================================================================
// 3. MOTOR DE DIÁLOGOS COM TEXTO GRADUAL & SKIP
// ============================================================================

/**
 * Exibe um diálogo na caixa universal com suporte a efeito de digitação e avanço rápido ao clicar.
 */
function exibirDialogo(nome, texto, avatarUrl, aoTerminar) {
  const caixa = document.getElementById("caixa-dialogo");
  const elNome = document.getElementById("nome-personagem");
  const elTexto = document.getElementById("texto-dialogo");
  const elAvatar = document.getElementById("avatar-img");
  const elIndicador = document.getElementById("indicador-continuar");

  caixa.style.display = "flex";
  elNome.textContent = nome;
  elTexto.textContent = "";
  if (elAvatar && avatarUrl) elAvatar.src = avatarUrl;
  if (elIndicador) elIndicador.style.display = "none";

  dialogoEmAndamento = true;
  estaDigitando = true;
  textoCompletoAtual = texto;
  elementoTextoAtual = elTexto;
  callbackAposTextoAtual = aoTerminar;

  if (intervaloDigitacao) clearInterval(intervaloDigitacao);

  let i = 0;
  intervaloDigitacao = setInterval(() => {
    if (i < texto.length) {
      elTexto.textContent += texto.charAt(i);
      if (i % 2 === 0) tocarSomTexto();
      i++;
    } else {
      concluirDigitacao();
    }
  }, 30);
}

function concluirDigitacao() {
  if (intervaloDigitacao) clearInterval(intervaloDigitacao);
  if (elementoTextoAtual && textoCompletoAtual) {
    elementoTextoAtual.textContent = textoCompletoAtual;
  }
  estaDigitando = false;
  const elIndicador = document.getElementById("indicador-continuar");
  if (elIndicador) elIndicador.style.display = "block";
}

function fecharDialogo() {
  const caixa = document.getElementById("caixa-dialogo");
  caixa.style.display = "none";
  dialogoEmAndamento = false;
  estaDigitando = false;
  if (intervaloDigitacao) clearInterval(intervaloDigitacao);
}

function tratarCliqueDialogo(event) {
  // Se estiver exibindo o formulário de nome, não avança no clique do diálogo
  const inputNome = document.getElementById("container-input-nome");
  if (inputNome && inputNome.style.display === "flex") {
    return;
  }

  if (estaDigitando) {
    // Se o jogador clicar durante a digitação, exibe todo o texto instantaneamente
    concluirDigitacao();
  } else if (dialogoEmAndamento && callbackAposTextoAtual) {
    tocarBeep(600, 0.05, "sine", 0.05);
    const proximaAcao = callbackAposTextoAtual;
    callbackAposTextoAtual = null;
    proximaAcao();
  }
}

// Atalho de teclado (Espaço ou Enter para avançar diálogo)
document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    const inputNome = document.getElementById("container-input-nome");
    if (inputNome && inputNome.style.display === "flex") {
      if (e.key === "Enter") salvarNome();
      return;
    }
    if (dialogoEmAndamento) {
      e.preventDefault();
      tratarCliqueDialogo();
    }
  }
});

// Efeito de transição de tela
function efeitoFlash(aoTerminar) {
  const flash = document.getElementById("overlay-flash");
  if (!flash) {
    if (aoTerminar) aoTerminar();
    return;
  }
  flash.classList.add("flash-ativo");
  setTimeout(() => {
    if (aoTerminar) aoTerminar();
    setTimeout(() => {
      flash.classList.remove("flash-ativo");
    }, 150);
  }, 200);
}

// ============================================================================
// 4. CENÁRIO 1: ENTRADA DA UCSAL
// ============================================================================

// ============================================================================
// 4. CENÁRIO 1: ENTRADA DA UCSAL & LOGIN SEGURO VIA BACKEND
// ============================================================================

async function entrarNoJogo() {
  obterAudioContext();
  tocarBeep(440, 0.15, "sine", 0.15);

  const inputNome = document.getElementById("login-nome");
  const inputSenha = document.getElementById("login-senha");
  
  let nome = inputNome ? inputNome.value.trim() : "Calouro UCSAL";
  let senha = inputSenha ? inputSenha.value.trim() : "123456";

  if (!nome) nome = "Calouro UCSAL";
  if (!senha) senha = "123456";

  nomeJogador = nome;

  // Conexão com o backend Node.js seguro para autenticação e armazenamento de credenciais
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, senha })
    });
    const resultado = await response.json();
    if (resultado.sucesso) {
      console.log("🔒 Autenticação segura via backend Node.js:", resultado.mensagem);
    }
  } catch (e) {
    console.warn("⚠️ Servidor backend offline. Usando autenticação local offline.", e);
  }

  // Atualiza nome na interface da batalha e vitória
  const displayNome = document.getElementById("display-nome-jogador");
  if (displayNome) displayNome.textContent = nomeJogador;
  const displayVit = document.getElementById("vitoria-nome-jogador");
  if (displayVit) displayVit.textContent = nomeJogador;

  document.getElementById("tela-inicial").style.display = "none";
  const cenario1 = document.getElementById("cenario1");
  cenario1.style.display = "block";

  const textoLegenda = document.getElementById("texto-legenda");
  const elLegenda = document.getElementById("legenda-inicial");
  textoLegenda.textContent = "";

  const mensagemIntro = `Mais um dia se inicia na Universidade Católica do Salvador (UCSAL)... Mas ${nomeJogador}, rumores estranhos rondam os servidores centrais.`;
  let i = 0;
  const intervaloIntro = setInterval(() => {
    textoLegenda.textContent += mensagemIntro.charAt(i);
    if (i % 2 === 0) tocarSomTexto();
    i++;
    if (i >= mensagemIntro.length) {
      clearInterval(intervaloIntro);
      elLegenda.onclick = () => {
        elLegenda.style.display = "none";
        document.getElementById("container-npc1").style.display = "flex";
      };
    }
  }, 35);

  // Permitir pular intro com clique na legenda
  elLegenda.onclick = () => {
    clearInterval(intervaloIntro);
    textoLegenda.textContent = mensagemIntro;
    elLegenda.onclick = () => {
      elLegenda.style.display = "none";
      document.getElementById("container-npc1").style.display = "flex";
    };
  };
}

function iniciarJogo() {
  entrarNoJogo();
}

function iniciarDialogoSeguranca() {
  const containerNpc1 = document.getElementById("container-npc1");
  containerNpc1.onclick = null; // evita re-cliques
  const balao = containerNpc1.querySelector(".balao-interacao");
  if (balao) balao.style.display = "none";

  exibirDialogo(
    "Segurança",
    "Entendido... sim, Coordenador Osbaldo... vou encaminhar o primeiro aluno com habilidade em computação...",
    AVATARES.seguranca,
    () => {
      exibirDialogo(
        "Segurança",
        "Ei, você! Isso mesmo, estudante! O campus está em alerta vermelho. Qual é o seu nome?",
        AVATARES.seguranca,
        () => {
          // Exibe o input para o nome
          const containerInput = document.getElementById("container-input-nome");
          containerInput.style.display = "flex";
          const input = document.getElementById("nome-jogador");
          input.focus();
        }
      );
    }
  );
}

function salvarNome() {
  const input = document.getElementById("nome-jogador");
  let valor = input.value.trim();
  if (!valor) {
    valor = "Calouro UCSAL";
  }
  nomeJogador = valor;

  // Atualiza nome na interface da batalha e vitória
  const displayNome = document.getElementById("display-nome-jogador");
  if (displayNome) displayNome.textContent = nomeJogador;
  const displayVit = document.getElementById("vitoria-nome-jogador");
  if (displayVit) displayVit.textContent = nomeJogador;

  document.getElementById("container-input-nome").style.display = "none";
  tocarBeep(587.33, 0.1, "sine"); // Ré agudo

  exibirDialogo(
    "Segurança",
    `Certo, ${nomeJogador}! É você mesmo quem a coordenação precisa. Vá correndo até o Gabinete do Coordenador Osbaldo!`,
    AVATARES.seguranca,
    () => {
      fecharDialogo();
      efeitoFlash(() => {
        document.getElementById("cenario1").style.display = "none";
        iniciarCenarioCoordenador();
      });
    }
  );
}

// ============================================================================
// 5. CENÁRIO 2: SALA DO COORDENADOR OSBALDO
// ============================================================================

function iniciarCenarioCoordenador() {
  const cenario2 = document.getElementById("cenario2");
  cenario2.style.display = "block";

  exibirDialogo(
    "Coordenador Osbaldo",
    `Olá, ${nomeJogador}! Que bom que você atendeu ao chamado de emergência. A situação da UCSAL é gravíssima!`,
    AVATARES.coordenador,
    () => {
      exibirDialogo(
        "Coordenador Osbaldo",
        "Um hacker perigoso que se autointitula 'O Mago da Web' invadiu nossos servidores no CPD!",
        AVATARES.coordenador,
        () => {
          exibirDialogo(
            "Coordenador Osbaldo",
            "Ele está corrompendo as notas, travando as matrículas e ameaçando derrubar todo o portal acadêmico!",
            AVATARES.coordenador,
            () => {
              exibirDialogo(
                "Coordenador Osbaldo",
                "Tome este Pen Drive com scripts sagrados de Programação Web. Só um estudante com conhecimentos afiados pode derrotá-lo!",
                AVATARES.coordenador,
                () => {
                  exibirDialogo(
                    "Coordenador Osbaldo",
                    `Mas antes de ir ao CPD, ${nomeJogador}, passe na Sala de Aula da Professora Janete no Bloco C. Ela vai testar sua capacidade em Cálculo!`,
                    AVATARES.coordenador,
                    () => {
                      fecharDialogo();
                      efeitoFlash(() => {
                        cenario2.style.display = "none";
                        iniciarCenarioJanete();
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}

// ============================================================================
// 5.5. CENÁRIO DE JANETE & MINI-GAME DE CÁLCULO
// ============================================================================

const PERGUNTAS_CALCULO = [
  {
    pergunta: "Quanto é a derivada de x² em relação a x?",
    opcoes: ["A) 2x", "B) x³ / 3", "C) 2"],
    correta: 0
  },
  {
    pergunta: "Qual é a integral indefinida de 2x dx?",
    opcoes: ["A) x² + C", "B) 2", "C) x"],
    correta: 0
  },
  {
    pergunta: "Quanto vale o limite de sin(x)/x quando x tende a 0?",
    opcoes: ["A) 0", "B) 1", "C) Indeterminado"],
    correta: 1
  }
];

let indicePerguntaCalculo = 0;

function iniciarCenarioJanete() {
  const cenarioJanete = document.getElementById("cenario-janete");
  cenarioJanete.style.display = "block";

  exibirDialogo(
    "Professora Janete",
    "Você acha mesmo que vai conseguir passar pelo Mago da Web sem aprender CÁLCULO?????",
    AVATARES.janete,
    () => {
      exibirDialogo(
        "Professora Janete",
        "Então você está muito enganado!!!!",
        AVATARES.janete,
        () => {
          exibirDialogo(
            "Professora Janete",
            "Por isso que você vai ter que responder algumas perguntas de cálculo para testar sua capacidade!",
            AVATARES.janete,
            () => {
              fecharDialogo();
              iniciarMiniGameCalculo();
            }
          );
        }
      );
    }
  );
}

function iniciarMiniGameCalculo() {
  indicePerguntaCalculo = 0;
  const painel = document.getElementById("painel-calculo");
  painel.style.display = "block";
  carregarPerguntaCalculo();
}

function carregarPerguntaCalculo() {
  if (indicePerguntaCalculo >= PERGUNTAS_CALCULO.length) {
    document.getElementById("painel-calculo").style.display = "none";
    tocarSomVitoria();
    exibirDialogo(
      "Professora Janete",
      "Excelente! Você passou no teste de cálculo com louvor. Tome esta bênção matemática (+20 Max HP / +10 Max MP) e vá derrotar o Mago da Web!",
      AVATARES.janete,
      () => {
        BATALHA_CONFIG.jogadorMaxHP += 20;
        BATALHA_CONFIG.jogadorMaxMP += 10;
        estadoBatalha.jogadorHP = BATALHA_CONFIG.jogadorMaxHP;
        estadoBatalha.jogadorMP = BATALHA_CONFIG.jogadorMaxMP;
        fecharDialogo();
        efeitoFlash(() => {
          document.getElementById("cenario-janete").style.display = "none";
          iniciarCenarioCPD();
        });
      }
    );
    return;
  }

  const q = PERGUNTAS_CALCULO[indicePerguntaCalculo];
  document.getElementById("pergunta-calculo").textContent = `Questão ${indicePerguntaCalculo + 1}: ${q.pergunta}`;
  for (let idx = 0; idx < 3; idx++) {
    const btn = document.getElementById(`opt-${idx}`);
    if (btn) {
      btn.textContent = q.opcoes[idx];
      btn.disabled = false;
    }
  }
  document.getElementById("feedback-calculo").textContent = "";
  document.getElementById("feedback-calculo").className = "";
}

function responderCalculo(opcao) {
  const q = PERGUNTAS_CALCULO[indicePerguntaCalculo];
  const elFeedback = document.getElementById("feedback-calculo");

  for (let idx = 0; idx < 3; idx++) {
    const btn = document.getElementById(`opt-${idx}`);
    if (btn) btn.disabled = true;
  }

  if (opcao === q.correta) {
    tocarSomCura();
    elFeedback.textContent = "✅ Correto! Janete aprova sua resposta!";
    elFeedback.className = "feedback-correto";
    indicePerguntaCalculo++;
    setTimeout(() => {
      carregarPerguntaCalculo();
    }, 1500);
  } else {
    tocarSomDano();
    elFeedback.textContent = "❌ Incorreto! Janete diz: 'Estude mais cálculo, calouro! Tente de novo.'";
    elFeedback.className = "feedback-errado";
    setTimeout(() => {
      for (let idx = 0; idx < 3; idx++) {
        const btn = document.getElementById(`opt-${idx}`);
        if (btn) btn.disabled = false;
      }
      elFeedback.textContent = "";
    }, 2000);
  }
}

// ============================================================================
// 6. CENÁRIO 3: CPD CENTRAL (BATALHA CONTRA RONNIE)
// ============================================================================

function iniciarCenarioCPD() {
  const cenario3 = document.getElementById("cenario3");
  cenario3.style.display = "block";

  const ronnieFight = document.getElementById("npc3-fight");
  const magoFinal = document.getElementById("npc-mago-final");

  if (ronnieFight) ronnieFight.style.display = "block";
  if (magoFinal) magoFinal.style.display = "none";

  exibirDialogo(
    "Ronnie, o Mago da Web",
    `Ora, ora... então o Coordenador Osbaldo enviou ${nomeJogador} para tentar me impedir? Você não passará por mim!`,
    AVATARES.ronnieFight,
    () => {
      fecharDialogo();
      iniciarArenaBatalha();
    }
  );
}

// ============================================================================
// 6.5. CENÁRIO 4: LABORATORIO DO PROFESSOR MÁRCIO (MAGO DA WEB DO BEM)
// ============================================================================

function iniciarCenarioMarcio() {
  document.body.classList.remove("corpo-insano");
  document.body.classList.remove("screen-shake");
  document.getElementById("modal-vitoria-ronnie").style.display = "none";
  document.getElementById("cenario3").style.display = "none";
  
  const cenario4 = document.getElementById("cenario4");
  cenario4.style.display = "block";

  exibirDialogo(
    "Márcio (Mago da Web do Bem)",
    `Excelente trabalho, ${nomeJogador}! Você derrotou Ronnie com bravura!`,
    AVATARES.marcio,
    () => {
      exibirDialogo(
        "Márcio (Mago da Web do Bem)",
        "Mas o verdadeiro criador do caos, O Mago da Web, está aguardando no Núcleo de Fogo (Cenário 5).",
        AVATARES.marcio,
        () => {
          exibirDialogo(
            "Márcio (Mago da Web do Bem)",
            "Tome esta bênção de mana (+20 MP). Você vai precisar responder às perguntas de programação dele para vencê-lo!",
            AVATARES.marcio,
            () => {
              estadoBatalha.jogadorMP = Math.min(BATALHA_CONFIG.jogadorMaxMP, estadoBatalha.jogadorMP + 20);
              fecharDialogo();
              efeitoFlash(() => {
                cenario4.style.display = "none";
                iniciarMiniGameProgramacao();
              });
            }
          );
        }
      );
    }
  );
}

// ============================================================================
// 6.6. MINI-GAME DE PROGRAMAÇÃO & CENÁRIO 5 (O MAGO DA WEB)
// ============================================================================

const PERGUNTAS_PROGRAMACAO = [
  {
    pergunta: "Qual comando do Git envia as alterações para o repositório remoto?",
    opcoes: ["A) git push", "B) git commit", "C) git pull"],
    correta: 0
  },
  {
    pergunta: "Em JavaScript, qual palavra-chave declara uma constante?",
    opcoes: ["A) var", "B) let", "C) const"],
    correta: 2
  },
  {
    pergunta: "Qual seletor CSS é usado para estilizar um elemento com id='principal'?",
    opcoes: ["A) .principal", "B) #principal", "C) principal"],
    correta: 1
  }
];

let indicePerguntaProg = 0;

function iniciarMiniGameProgramacao() {
  const cenario5 = document.getElementById("cenario5");
  cenario5.style.display = "block";

  const magoFinal = document.getElementById("npc-mago-final");
  if (magoFinal) magoFinal.style.display = "block";

  exibirDialogo(
    "O Mago da Web",
    "Ora, ora... então você chegou ao Núcleo dos Servidores! Vamos ver se sua lógica de programação é páreo para o meu código supremo!",
    AVATARES.magoWeb,
    () => {
      fecharDialogo();
      const painel = document.getElementById("painel-programacao");
      painel.style.display = "block";
      indicePerguntaProg = 0;
      carregarPerguntaProgramacao();
    }
  );
}

function carregarPerguntaProgramacao() {
  if (indicePerguntaProg >= PERGUNTAS_PROGRAMACAO.length) {
    document.getElementById("painel-programacao").style.display = "none";
    tocarSomVitoria();
    exibirDialogo(
      "O Mago da Web",
      "Não pode ser... Minhas linhas de código foram refatoradas pela sua lógica de programação impecável! Os servidores da UCSAL estão salvos...",
      AVATARES.magoWeb,
      () => {
        fecharDialogo();
        const cenario5 = document.getElementById("cenario5");
        if (cenario5) cenario5.style.display = "none";
        const modalVit = document.getElementById("modal-vitoria");
        if (modalVit) modalVit.style.display = "flex";
      }
    );
    return;
  }

  const q = PERGUNTAS_PROGRAMACAO[indicePerguntaProg];
  document.getElementById("pergunta-prog").textContent = `Questão ${indicePerguntaProg + 1}: ${q.pergunta}`;
  for (let idx = 0; idx < 3; idx++) {
    const btn = document.getElementById(`prog-opt-${idx}`);
    if (btn) {
      btn.textContent = q.opcoes[idx];
      btn.disabled = false;
    }
  }
  document.getElementById("feedback-prog").textContent = "";
  document.getElementById("feedback-prog").className = "";
}

function responderProgramacao(opcao) {
  const q = PERGUNTAS_PROGRAMACAO[indicePerguntaProg];
  const elFeedback = document.getElementById("feedback-prog");

  for (let idx = 0; idx < 3; idx++) {
    const btn = document.getElementById(`prog-opt-${idx}`);
    if (btn) btn.disabled = true;
  }

  if (opcao === q.correta) {
    tocarSomCura();
    elFeedback.textContent = "✅ Correto! Excelente lógica de programação!";
    elFeedback.className = "feedback-correto";
    indicePerguntaProg++;
    setTimeout(() => {
      carregarPerguntaProgramacao();
    }, 1500);
  } else {
    tocarSomDano();
    elFeedback.textContent = "❌ Incorreto! O Mago da Web ri: 'Sintaxe inválida!'";
    elFeedback.className = "feedback-errado";
    setTimeout(() => {
      for (let idx = 0; idx < 3; idx++) {
        const btn = document.getElementById(`prog-opt-${idx}`);
        if (btn) btn.disabled = false;
      }
      elFeedback.textContent = "";
    }, 2000);
  }
}

// ============================================================================
// 7. SISTEMA DE BATALHA RPG EM TURNOS
// ============================================================================

const BATALHA_CONFIG = {
  jogadorMaxHP: 100,
  jogadorMaxMP: 50,
  bossMaxHP: 150
};

let estadoBatalha = {
  jogadorHP: 100,
  jogadorMP: 50,
  bossHP: 150,
  usosCafe: 2,
  usosBauru: 1,
  firewallAtivo: false,
  turnoTravado: false,
  bossInsano: false,
  turnosStunBoss: 0,
  faseBoss: 1
};

function iniciarArenaBatalha() {
  document.getElementById("arena-batalha").style.display = "flex";
  resetarEstadoBatalha();
  atualizarHUD();
  
  // Troca para música de batalha
  tocarMusica(SONS.battle);
  
  adicionarLog("⚠️ O Mago da Web Ronnie assumiu sua forma de batalha!", "linha-sistema");
  adicionarLog(`Comandos disponíveis para ${nomeJogador}. Escolha sua estratégia de TI!`, "linha-aluno");
}

function resetarEstadoBatalha() {
  estadoBatalha.jogadorHP = BATALHA_CONFIG.jogadorMaxHP;
  estadoBatalha.jogadorMP = BATALHA_CONFIG.jogadorMaxMP;
  if (estadoBatalha.faseBoss === 1) {
    BATALHA_CONFIG.bossMaxHP = 150;
    estadoBatalha.bossHP = BATALHA_CONFIG.bossMaxHP;
  } else {
    BATALHA_CONFIG.bossMaxHP = 200;
    estadoBatalha.bossHP = BATALHA_CONFIG.bossMaxHP;
  }
  estadoBatalha.usosCafe = 2;
  estadoBatalha.usosBauru = 1;
  estadoBatalha.firewallAtivo = false;
  estadoBatalha.turnoTravado = false;
  estadoBatalha.bossInsano = false;
  estadoBatalha.turnosStunBoss = 0;
  
  document.body.classList.remove("corpo-insano");
  const ronnieFight = document.getElementById("npc3-fight");
  const magoEl = document.getElementById("npc-mago-final");
  if (estadoBatalha.faseBoss === 1) {
    if (ronnieFight) {
      ronnieFight.style.display = "block";
      ronnieFight.classList.remove("responsividade-insana");
    }
    if (magoEl) magoEl.style.display = "none";
  } else {
    if (ronnieFight) ronnieFight.style.display = "none";
    if (magoEl) {
      magoEl.style.display = "block";
      magoEl.classList.remove("responsividade-insana");
    }
  }

  const nomeBossEl = document.querySelector(".nome-boss");
  if (nomeBossEl) {
    if (estadoBatalha.faseBoss === 1) {
      nomeBossEl.innerHTML = '🧙‍♂️ Ronnie, o Mago da Web <span id="boss-status-badge" class="badge-status">Lv. 99 Boss</span>';
    } else {
      nomeBossEl.innerHTML = '🧙‍♂️ O Mago da Web (Boss Final) <span id="boss-status-badge" class="badge-status" style="background:#e74c3c;">Lv. 100 Boss</span>';
    }
  }

  const descCafe = document.getElementById("cafe-usos-desc");
  if (descCafe) descCafe.textContent = "Restaura HP/MP (2 usos)";
  const descBauru = document.getElementById("bauru-usos-desc");
  if (descBauru) descBauru.textContent = "Cura Crítica 50 HP (1 uso)";
}

function atualizarHUD() {
  // Vida do Boss
  const bossPct = Math.max(0, (estadoBatalha.bossHP / BATALHA_CONFIG.bossMaxHP) * 100);
  const barraBoss = document.getElementById("barra-vida-boss");
  const txtBoss = document.getElementById("texto-vida-boss");
  if (barraBoss) {
    barraBoss.style.width = `${bossPct}%`;
    if (bossPct < 25) barraBoss.style.background = "linear-gradient(90deg, #ff0000, #ff4d4d)";
    else barraBoss.style.background = "linear-gradient(90deg, #e74c3c, #9b59b6)";
  }
  if (txtBoss) txtBoss.textContent = `${estadoBatalha.bossHP} / ${BATALHA_CONFIG.bossMaxHP} HP`;

  // Vida do Jogador
  const jogHPPct = Math.max(0, (estadoBatalha.jogadorHP / BATALHA_CONFIG.jogadorMaxHP) * 100);
  const barraJogHP = document.getElementById("barra-vida-jogador");
  const txtJogHP = document.getElementById("texto-vida-jogador");
  if (barraJogHP) barraJogHP.style.width = `${jogHPPct}%`;
  if (txtJogHP) txtJogHP.textContent = `${estadoBatalha.jogadorHP}/${BATALHA_CONFIG.jogadorMaxHP}`;

  // Mana do Jogador
  const jogMPPct = Math.max(0, (estadoBatalha.jogadorMP / BATALHA_CONFIG.jogadorMaxMP) * 100);
  const barraJogMP = document.getElementById("barra-mana-jogador");
  const txtJogMP = document.getElementById("texto-mana-jogador");
  if (barraJogMP) barraJogMP.style.width = `${jogMPPct}%`;
  if (txtJogMP) txtJogMP.textContent = `${estadoBatalha.jogadorMP}/${BATALHA_CONFIG.jogadorMaxMP}`;

  atualizarBotoesAcao();
}

function atualizarBotoesAcao() {
  const botoes = document.querySelectorAll(".btn-acao");
  botoes.forEach((btn) => {
    if (estadoBatalha.turnoTravado) {
      btn.disabled = true;
      return;
    }
    
    // Lógica específica por botão
    if (btn.classList.contains("btn-magia")) btn.disabled = estadoBatalha.jogadorMP < 15;
    else if (btn.classList.contains("btn-defesa")) btn.disabled = estadoBatalha.jogadorMP < 10;
    else if (btn.classList.contains("btn-supremo")) btn.disabled = estadoBatalha.jogadorMP < 25;
    else if (btn.classList.contains("btn-item") && btn.id === "btn-cafe") btn.disabled = estadoBatalha.usosCafe <= 0;
    else if (btn.classList.contains("btn-especial")) btn.disabled = estadoBatalha.usosBauru <= 0;
    else if (btn.getAttribute("onclick").includes("'osbaldo'")) btn.disabled = estadoBatalha.jogadorMP < 20;
    else if (btn.getAttribute("onclick").includes("'seguranca'")) btn.disabled = estadoBatalha.jogadorMP < 15;
    else btn.disabled = false;
  });
}

function adicionarLog(mensagem, classeCss = "linha-sistema") {
  const logContainer = document.getElementById("log-batalha");
  if (!logContainer) return;
  const p = document.createElement("p");
  p.className = `linha-log ${classeCss}`;
  p.textContent = `> ${mensagem}`;
  logContainer.appendChild(p);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function animarDanoFlutuante(texto, cor = "#e74c3c") {
  const el = document.getElementById("flutuante-dano");
  if (!el) return;
  el.textContent = texto;
  el.style.color = cor;
  el.className = "flutuante-dano flutuante-anim";
  setTimeout(() => {
    el.className = "flutuante-dano";
  }, 1000);
}

function tremerTela() {
  document.body.classList.add("screen-shake");
  setTimeout(() => {
    document.body.classList.remove("screen-shake");
  }, 350);
}

// ============================================================================
// AÇÕES DO JOGADOR
// ============================================================================
function acaoJogador(tipo) {
  if (estadoBatalha.turnoTravado) return;
  estadoBatalha.turnoTravado = true;
  atualizarBotoesAcao();

  switch (tipo) {
    case "css":
      tocarSomAtaque();
      const danoCSS = Math.floor(18 + Math.random() * 9);
      estadoBatalha.bossHP = Math.max(0, estadoBatalha.bossHP - danoCSS);
      adicionarLog(`${nomeJogador} aplicou Injeção de CSS! Estilo corrompido: ${danoCSS} de dano!`, "linha-aluno");
      animarDanoBoss(`-${danoCSS} HP`);
      break;

    case "ddos":
      if (estadoBatalha.jogadorMP < 15) return;
      estadoBatalha.jogadorMP -= 15;
      tocarSomAtaque();
      const danoDDoS = Math.floor(32 + Math.random() * 10);
      estadoBatalha.bossHP = Math.max(0, estadoBatalha.bossHP - danoDDoS);
      adicionarLog(`${nomeJogador} executou DDoS Reverso! Servidor do Mago sobrecarregado: ${danoDDoS} de dano!`, "linha-aluno");
      animarDanoBoss(`-${danoDDoS} OVERFLOW!`, "#3498db");
      break;

    case "firewall":
      if (estadoBatalha.jogadorMP < 10) return;
      estadoBatalha.jogadorMP -= 10;
      tocarSomCura();
      estadoBatalha.firewallAtivo = true;
      estadoBatalha.jogadorHP = Math.min(BATALHA_CONFIG.jogadorMaxHP, estadoBatalha.jogadorHP + 20);
      adicionarLog(`${nomeJogador} ativou o Firewall! Defesa aumentada e +20 HP recuperados!`, "linha-aluno");
      animarDanoFlutuante("+20 HP", "#2ecc71");
      break;

    case "git":
      if (estadoBatalha.jogadorMP < 25) return;
      estadoBatalha.jogadorMP -= 25;
      tocarSomDano();
      tremerTela();
      const danoGit = Math.floor(50 + Math.random() * 15);
      estadoBatalha.bossHP = Math.max(0, estadoBatalha.bossHP - danoGit);
      adicionarLog(`💥 GOLPE SUPREMO! 'git push --force' sobrescreveu o núcleo do Mago! ${danoGit} de dano!`, "linha-aluno");
      animarDanoBoss(`-${danoGit} CRITICAL!`, "#f1c40f");
      break;

    case "cafe":
      if (estadoBatalha.usosCafe <= 0) return;
      estadoBatalha.usosCafe--;
      tocarSomCura();
      estadoBatalha.jogadorHP = Math.min(BATALHA_CONFIG.jogadorMaxHP, estadoBatalha.jogadorHP + 35);
      estadoBatalha.jogadorMP = Math.min(BATALHA_CONFIG.jogadorMaxMP, estadoBatalha.jogadorMP + 25);
      document.getElementById("cafe-usos-desc").textContent = `Restaura HP/MP (${estadoBatalha.usosCafe} usos)`;
      adicionarLog(`${nomeJogador} tomou o Café da Cantina! Energia restaurada!`, "linha-aluno");
      animarDanoFlutuante("+35 HP / +25 MP", "#e67e22");
      break;

    case "bauru":
      if (estadoBatalha.usosBauru <= 0) return;
      estadoBatalha.usosBauru--;
      tocarSomCura();
      estadoBatalha.jogadorHP = Math.min(BATALHA_CONFIG.jogadorMaxHP, estadoBatalha.jogadorHP + 50);
      document.getElementById("bauru-usos-desc").textContent = "Cura Crítica 50 HP (Esgotado)";
      adicionarLog(`${nomeJogador} comeu um Bauru do Bananas! Recuperação massiva de 50 HP!`, "linha-aluno");
      animarDanoFlutuante("+50 HP", "#9b59b6");
      break;

    case "osbaldo":
      if (estadoBatalha.jogadorMP < 20) return;
      estadoBatalha.jogadorMP -= 20;
      tocarSomCura();
      estadoBatalha.jogadorHP = Math.min(BATALHA_CONFIG.jogadorMaxHP, estadoBatalha.jogadorHP + 15);
      // Buff temporário ou cura
      adicionarLog("👨‍🏫 Osbaldo apareceu e te deu um Bolo de Pote! 'Não desista do semestre!' +15 HP e motivação!", "linha-sistema");
      animarDanoFlutuante("+15 HP (Bolo de Pote)", "#f1c40f");
      break;

    case "seguranca":
      if (estadoBatalha.jogadorMP < 15) return;
      estadoBatalha.jogadorMP -= 15;
      tocarSomAtaque();
      estadoBatalha.turnosStunBoss = 1;
      adicionarLog("👮 O Guarda da UCSAL usou o Rádio! 'Central, temos um invasor no CPD!' Ronnie ficou confuso!", "linha-sistema");
      animarDanoBoss("STUN!", "#f7dc6f");
      break;
  }

  atualizarHUD();

  if (estadoBatalha.bossHP <= 0) {
    if (estadoBatalha.faseBoss === 1) {
      setTimeout(() => {
        document.getElementById("arena-batalha").style.display = "none";
        tocarSomVitoria();
        document.getElementById("modal-vitoria-ronnie").style.display = "flex";
      }, 800);
    } else {
      setTimeout(concluirVitoria, 800);
    }
    return;
  }

  // Verifica se o Boss entra em modo "Responsividade Insana" (abaixo de 25% HP)
  if (estadoBatalha.bossHP < 40 && !estadoBatalha.bossInsano) {
    estadoBatalha.bossInsano = true;
    const bossSprite = estadoBatalha.faseBoss === 1 ? document.getElementById("npc3-fight") : document.getElementById("npc-mago-final");
    if (bossSprite) bossSprite.classList.add("responsividade-insana");
    document.body.classList.add("corpo-insano");
    const nomeInimigo = estadoBatalha.faseBoss === 1 ? "Ronnie" : "O Mago da Web";
    adicionarLog(`❗ CUIDADO! ${nomeInimigo} ativou a RESPONSIVIDADE INSANA! Seus ataques serão mais rápidos e erráticos!`, "linha-sistema");
  }

  setTimeout(turnoDoBoss, 1200);
}

function animarDanoBoss(texto, cor = "#e74c3c") {
  const bossSprite = estadoBatalha.faseBoss === 1 ? document.getElementById("npc3-fight") : document.getElementById("npc-mago-final");
  if (bossSprite) {
    bossSprite.classList.add("boss-dano");
    setTimeout(() => bossSprite.classList.remove("boss-dano"), 400);
  }
  animarDanoFlutuante(texto, cor);
}

// ============================================================================
// TURNO DO BOSS (RONNIE / O MAGO DA WEB)
// ============================================================================
function turnoDoBoss() {
  if (estadoBatalha.turnosStunBoss > 0) {
    estadoBatalha.turnosStunBoss--;
    const nomeChefaoStun = estadoBatalha.faseBoss === 1 ? "Ronnie" : "O Mago da Web";
    adicionarLog(`🧙‍♂️ ${nomeChefaoStun} está tentando recuperar o acesso e não agiu!`, "linha-sistema");
    estadoBatalha.turnoTravado = false;
    atualizarBotoesAcao();
    return;
  }

  const bossSprite = estadoBatalha.faseBoss === 1 ? document.getElementById("npc3-fight") : document.getElementById("npc-mago-final");
  if (bossSprite) {
    bossSprite.classList.add("boss-ataque");
    setTimeout(() => bossSprite.classList.remove("boss-ataque"), 500);
  }

  let ataquesBoss = [
    { nome: "Erro 500: Internal Server Error", danoMin: 14, danoMax: 20, msg: "disparou uma exceção!" },
    { nome: "Loop Infinito", danoMin: 18, danoMax: 24, msg: "travou sua thread!" },
    { nome: "Vazamento de Memória", danoMin: 12, danoMax: 18, drenaMP: 8, msg: "drenou sua mana!" },
    { nome: "Ataque de Phishing", danoMin: 22, danoMax: 30, msg: "tentou roubar seus dados!" }
  ];

  if (estadoBatalha.bossInsano) {
    ataquesBoss.push({ nome: "HTMLASER", danoMin: 25, danoMax: 35, msg: "disparou um laser de tags puras!" });
    ataquesBoss.push({ nome: "CSSabugada", danoMin: 28, danoMax: 38, msg: "estilizou sua derrota com CSS crítico!" });
  }

  const ataqueEscolhido = ataquesBoss[Math.floor(Math.random() * ataquesBoss.length)];
  let danoFinal = Math.floor(ataqueEscolhido.danoMin + Math.random() * (ataqueEscolhido.danoMax - ataqueEscolhido.danoMin + 1));

  const nomeChefao = estadoBatalha.faseBoss === 1 ? "Ronnie" : "O Mago da Web";

  if (estadoBatalha.firewallAtivo) {
    estadoBatalha.firewallAtivo = false;
    danoFinal = Math.floor(danoFinal * 0.25);
    tocarSomAtaque();
    adicionarLog(`🛡️ O Firewall BLOQUEOU '${ataqueEscolhido.nome}'! Dano: ${danoFinal}!`, "linha-sistema");
  } else {
    tocarSomDano();
    tremerTela();
    adicionarLog(`🧙‍♂️ ${nomeChefao} usou '${ataqueEscolhido.nome}'! ${ataqueEscolhido.msg} Dano: ${danoFinal}!`, "linha-boss");
  }

  if (ataqueEscolhido.drenaMP) {
    estadoBatalha.jogadorMP = Math.max(0, estadoBatalha.jogadorMP - ataqueEscolhido.drenaMP);
    adicionarLog(`⚠️ Você perdeu ${ataqueEscolhido.drenaMP} MP!`, "linha-boss");
  }

  estadoBatalha.jogadorHP = Math.max(0, estadoBatalha.jogadorHP - danoFinal);
  atualizarHUD();

  if (estadoBatalha.jogadorHP <= 0) {
    setTimeout(concluirDerrota, 800);
    return;
  }

  estadoBatalha.turnoTravado = false;
  atualizarBotoesAcao();
}

// ============================================================================
// 8. TELAS FINAIS (VITÓRIA E DERROTA) & TRANSIÇÃO DE BOSS
// ============================================================================

function iniciarFaseMagoDaWeb() {
  document.getElementById("modal-vitoria-ronnie").style.display = "none";
  tocarSomVitoria();

  exibirDialogo(
    "O Mago da Web",
    "Inútil Ronnie! Deixe que o verdadeiro Mago da Web termine este serviço e delete sua matrícula para sempre!",
    AVATARES.magoWeb,
    () => {
      fecharDialogo();
      efeitoFlash(() => {
        estadoBatalha.faseBoss = 2;
        BATALHA_CONFIG.bossMaxHP = 200;
        estadoBatalha.bossHP = BATALHA_CONFIG.bossMaxHP;
        estadoBatalha.bossInsano = false;

        const ronnieFight = document.getElementById("npc3-fight");
        const magoEl = document.getElementById("npc-mago-final");
        if (ronnieFight) ronnieFight.style.display = "none";
        if (magoEl) {
          magoEl.style.display = "block";
          magoEl.classList.remove("responsividade-insana");
        }
        document.body.classList.remove("corpo-insano");

        const nomeBossEl = document.querySelector(".nome-boss");
        if (nomeBossEl) {
          nomeBossEl.innerHTML = '🧙‍♂️ O Mago da Web (Boss Final) <span id="boss-status-badge" class="badge-status" style="background:#e74c3c;">Lv. 100 Boss</span>';
        }

        document.getElementById("arena-batalha").style.display = "flex";
        atualizarHUD();
        adicionarLog("⚡ BATALHA FINAL: O verdadeiro Mago da Web entrou em cena no núcleo do CPD!", "linha-sistema");
        adicionarLog("O Mago da Web: 'Preparado para o erro 500 eterno?'", "linha-boss");
      });
    }
  );
}

function concluirVitoria() {
  tocarSomVitoria();
  document.getElementById("arena-batalha").style.display = "none";
  const cenario5 = document.getElementById("cenario5");
  if (cenario5) cenario5.style.display = "none";
  fecharDialogo();

  const modalVit = document.getElementById("modal-vitoria");
  if (modalVit) modalVit.style.display = "flex";
}

function concluirDerrota() {
  tocarSomDerrota();
  document.getElementById("arena-batalha").style.display = "none";
  
  const nomeChefao = estadoBatalha.faseBoss === 1 ? "Ronnie" : "O Mago da Web";
  const avatarChefao = estadoBatalha.faseBoss === 1 ? AVATARES.ronnieFight : AVATARES.magoWeb;

  exibirDialogo(
    nomeChefao,
    "Hahaha! Seus scripts quebraram em produção! O portal da UCSAL agora pertence às trevas do código espaguete!",
    avatarChefao,
    () => {
      fecharDialogo();
      const modalDerrota = document.getElementById("modal-derrota");
      modalDerrota.style.display = "flex";
    }
  );
}

function tentarNovamenteBatalha() {
  document.getElementById("modal-derrota").style.display = "none";
  fecharDialogo();
  
  // Reinicia arena de batalha direto com HP e MP cheios
  const ronnieFight = document.getElementById("npc3-fight");
  ronnieFight.style.display = "block";
  document.getElementById("arena-batalha").style.display = "flex";
  
  resetarEstadoBatalha();
  atualizarHUD();
  adicionarLog("Reiniciando deploy seguro... Segunda chance para salvar a UCSAL!", "linha-sistema");
}

function reiniciarJogo() {
  // Esconde todos os modais e cenários
  document.getElementById("modal-vitoria").style.display = "none";
  document.getElementById("modal-derrota").style.display = "none";
  document.getElementById("cenario1").style.display = "none";
  document.getElementById("cenario2").style.display = "none";
  document.getElementById("cenario3").style.display = "none";
  document.getElementById("cenario4").style.display = "none";
  document.getElementById("cenario5").style.display = "none";
  document.getElementById("arena-batalha").style.display = "none";
  fecharDialogo();

  // Restaura música do menu
  tocarMusica(SONS.bgm);

  // Restaura elementos iniciais
  const elLegenda = document.getElementById("legenda-inicial");
  if (elLegenda) elLegenda.style.display = "flex";
  const npc1Container = document.getElementById("container-npc1");
  if (npc1Container) {
    npc1Container.style.display = "none";
    npc1Container.onclick = iniciarDialogoSeguranca;
    const balao = npc1Container.querySelector(".balao-interacao");
    if (balao) balao.style.display = "block";
  }

  // Exibe tela inicial
  document.getElementById("tela-inicial").style.display = "flex";
}

function sairDoJogo() {
  try {
    window.close();
  } catch (e) {}
  document.body.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0d131a; color:#fff; font-family:'JetBrains Mono', monospace; text-align:center; padding:20px;">
      <h1 style="color:#f1c40f; font-size:36px; margin-bottom:15px;">Obrigado por Jogar!</h1>
      <p style="font-size:18px; color:#cfd9e8; max-width:600px; line-height:1.6;">Os servidores da UCSAL estão seguros e a sua aprovação está garantida. Você já pode fechar esta aba com segurança.</p>
      <button onclick="location.reload()" style="margin-top:30px; padding:12px 30px; background:#2D3E56; color:#fff; border:2px solid #ABCFE5; border-radius:30px; cursor:pointer; font-size:16px;">Voltar ao Início</button>
    </div>
  `;
}
