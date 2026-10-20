function interfaceDeCombate() {
  const menu = document.getElementById("menu-combate");
  if (!menu) return console.error("Elemento #menu-combate não encontrado.");
  menu.style.display = "flex";
  configurarBotoesCombate();
}
function configurarBotoesCombate() {
  document.querySelectorAll(".botao-combate").forEach(btn => {
    btn.onclick = () => {
      if (emTurno) return;

      switch (btn.textContent.trim()) {
        case "Lutar":
          atacarInimigo();
          break;
        case "Especial":
          abrirMenuOpcoes(especiais, "especial");
          break;
        case "Item":
          abrirMenuOpcoes(itens, "item");
          break;
        case "Fugir":
          escreverTextoGradualmente("Você tenta fugir... mas ainda não há escapatória.", "texto-dialogo");
          break;
      }
    };
  });
}

const jogador = {
  vida: 50,
  ataque: 12,
  defesa: 5,
  devPower: 10,
  devEnergy: 3
};

const ronnie = {
  vida: 50,
  ataque: 10,
  defesa: 10,
  devPower: 10
};

let pularTurnoRonnie = false;
let usouBoloDePote = false;
let emTurno = false;
let efeitoCoxinha = 0;

const especiais = [
  {
    nome: "Chorar",
    descricao: "Você chora de desespero, ataque do professor reduz em 5",
    custo: 2,
    acao: () => {
      ronnie.ataque = Math.max(0, ronnie.ataque - 5);
      ronnie.defesa = Math.max(0, ronnie.defesa - 5);
      jogador.devEnergy -= 2;
      escreverTextoGradualmente("Você chora, sai até ranho do nariz, o professor se comove e sofre -5 DE ATAQUE E -5 DE DEFESA", "texto-dialogo", () => {
        atualizarBarras();
        setTimeout(turnoRonnie, 1000);
      });
    }
  },
  {
    nome: "Pedir Prazo",
    descricao: "O professor não age por um turno",
    custo: 2,
    acao: () => {
      jogador.devEnergy -= 2;
      pularTurnoRonnie = true;
      escreverTextoGradualmente("Você pede prazo. O professor se frustra e não age no próximo turno.", "texto-dialogo", () => {
        atualizarBarras();
      });
    }
  }
];

const inventario = {
  "RedBull": 3,
  "Cigarro": 1,
  "Bauru do Bananas": 4,
  "MiniCoxinhas": 3
};

const itens = [
  {
    nome: "RedBull",
    descricao: "Cura 5 de DevEnergy",
    uso: () => {
      jogador.devEnergy = Math.min(3, jogador.devEnergy + 5);
      escreverTextoGradualmente("Você bebe um RedBull e sente energia percorrer seu código!", "texto-dialogo", atualizarBarras);
    }
  },
  {
    nome: "Cigarro",
    descricao: "Cura 2 de DevEnergy",
    uso: () => {
      jogador.devEnergy = Math.min(3, jogador.devEnergy + 2);
      escreverTextoGradualmente("Você fuma um cigarro... não recomendado, mas você se sente +2 DevEnergy", "texto-dialogo", atualizarBarras);
    }
  },
  {
    nome: "Bauru do Bananas",
    descricao: "Cura 15 de vida",
    uso: () => {
      jogador.vida = Math.min(50, jogador.vida + 15);
      escreverTextoGradualmente("Você come um Bauru do Bananas. Delicioso e curativo.", "texto-dialogo", atualizarBarras);
    }
  },
  {
    nome: "MiniCoxinhas",
    descricao: "Cura 2 de vida a cada turno por 5 turnos",
    uso: () => {
      efeitoCoxinha = 5;
      escreverTextoGradualmente("Você come um pacote de MiniCoxinhas. Isso vai durar por 5 turnos!", "texto-dialogo");
    }
  }
];

function abrirMenuOpcoes(lista, tipo) {
  const painel = document.getElementById("painel-opcoes");
  const ul = document.getElementById("lista-opcoes");
  const descricao = document.getElementById("texto-descricao");
  const custo = document.getElementById("custo-energia");
  const usarBtn = document.getElementById("usar-opcao");

  painel.style.display = "flex";
  ul.innerHTML = "";

  let index = 0;

  lista.forEach((opcao, i) => {
    const li = document.createElement("li");
    li.textContent = opcao.nome;
    if (i === index) li.classList.add("selected");
    ul.appendChild(li);
  });

  function atualizarInfo(i) {
    ul.querySelectorAll("li").forEach(li => li.classList.remove("selected"));
    ul.children[i].classList.add("selected");
    descricao.textContent = lista[i].descricao;
    custo.textContent = tipo === "especial" ? `${lista[i].custo} DevEnergy` : "";
  }

  atualizarInfo(index);

  ul.onclick = (e) => {
    const items = [...ul.children];
    index = items.indexOf(e.target);
    atualizarInfo(index);
  };

  usarBtn.onclick = () => {
    painel.style.display = "none";
    if (tipo === "especial") {
      if (jogador.devEnergy < lista[index].custo) {
        escreverTextoGradualmente("Você não tem DevEnergy suficiente!", "texto-dialogo");
        return;
      }
      lista[index].acao();
    } else {
      const nome = lista[index].nome;
      if (inventario[nome] <= 0) {
        escreverTextoGradualmente("Você não tem mais esse item!", "texto-dialogo");
        return;
      }
      inventario[nome]--;
      lista[index].uso();
    }
    atualizarBarras();
  };
}

function turnoRonnie() {
  if (pularTurnoRonnie) {
    pularTurnoRonnie = false;
    escreverTextoGradualmente("Ronnie está frustrado e não agiu esse turno!", "texto-dialogo", () => {
      emTurno = false;
    });
    return;
  }

  const acoes = [];

  if (ronnie.vida <= 15) {
    responsividadeInsana();
    return;
  }

  if (Math.random() < 0.3) acoes.push("ataque");
  if (Math.random() < 0.3) acoes.push("htmlaser");
  if (Math.random() < 0.3) acoes.push("cssabugada");
  if (!usouBoloDePote && ronnie.vida < 50 && Math.random() < 0.1) acoes.push("bolo");

  const acaoEscolhida = acoes.length > 0 ? acoes[Math.floor(Math.random() * acoes.length)] : "ataque";

  switch (acaoEscolhida) {
    case "ataque":
      acaoAtaqueRonnie(); break;
    case "htmlaser":
      acaoHTMLASER(); break;
    case "cssabugada":
      acaoCSSabugada(); break;
    case "bolo":
      acaoBoloDePote(); break;
    default:
      acaoAtaqueRonnie();
  }
}

function acaoAtaqueRonnie() {
  const dano = Math.max(ronnie.ataque - jogador.defesa, 1);
  jogador.vida -= dano;

  escreverTextoGradualmente(`Ronnie atacou você e causou ${dano} de dano.`, "texto-dialogo", () => {
    atualizarBarras();
    if (jogador.vida <= 0) return encerrarCombate("derrota");
    emTurno = false;
  });
}

function acaoHTMLASER() {
  const dano = Math.floor(ronnie.devPower / 2);
  jogador.vida -= dano;

  escreverTextoGradualmente(`Esses são os poderes de Dev. Todos temos um poder secreto chamado <span style="color:dodgerblue">DEVPOWER</span>. Veja como é, e então ele usa...`, "texto-dialogo", () => {
    escreverTextoGradualmente(`Ronnie lançou HTMLASER e causou ${dano} de dano mágico!`, "texto-dialogo", () => {
      atualizarBarras();
      if (jogador.vida <= 0) return encerrarCombate("derrota");
      emTurno = false;
    });
  });
}

function acaoCSSabugada() {
  const dano = Math.max((ronnie.ataque + 10) - jogador.defesa, 1);
  jogador.vida -= dano;

  escreverTextoGradualmente(`Esses são os poderes de Dev. Todos temos um poder secreto chamado <span style="color:dodgerblue">DEVPOWER</span>. Veja como é, e então ele usa...`, "texto-dialogo", () => {
    escreverTextoGradualmente(`Ronnie lançou CSSabugada e causou ${dano} de dano físico!`, "texto-dialogo", () => {
      atualizarBarras();
      if (jogador.vida <= 0) return encerrarCombate("derrota");
      emTurno = false;
    });
  });
}

function acaoBoloDePote() {
  ronnie.vida = Math.min(50, ronnie.vida + 10);
  usouBoloDePote = true;

  escreverTextoGradualmente("HMMM bolo de pote, obrigado Osbaldo", "texto-dialogo", () => {
    atualizarBarras();
    emTurno = false;
  });
}

function responsividadeInsana() {
  jogador.ataque = Math.max(0, jogador.ataque - 10);
  document.body.style.transform = "rotate(2deg)";
  setTimeout(() => document.body.style.transform = "", 1000);

  escreverTextoGradualmente("Se você conseguir vencer depois disso, terá uma chance com o mago da web!", "texto-dialogo", () => {
    atualizarBarras();
    emTurno = false;
  });
}
// 📦 Inicializa o sistema de combate
function iniciarSistemaDeCombate() {
  // Resetar variáveis
  emTurno = false;
  pularTurnoRonnie = false;
  usouBoloDePote = false;
  efeitoCoxinha = 0;

  // Resetar status do jogador e inimigo
  jogador.vida = 50;
  jogador.devEnergy = 3;
  jogador.ataque = 12;
  jogador.defesa = 5;
  ronnie.vida = 50;
  ronnie.ataque = 10;
  ronnie.defesa = 10;

  // Atualizar HUD
  atualizarBarras();

  // Exibir interface de combate
  interfaceDeCombate();

  // Mensagem de início de combate
  escreverTextoGradualmente("Prepare-se para a batalha! Ronnie está à sua frente, pronto para o desafio!", "texto-dialogo");

  // Começa o primeiro turno (o jogador começa)
  emTurno = false;
// 📌 Atacar o inimigo
function atacarInimigo() {
  if (emTurno) return;
  emTurno = true;

  const dano = Math.max(jogador.ataque - ronnie.defesa, 1);
  ronnie.vida -= dano;

  escreverTextoGradualmente(`Você atacou Ronnie e causou ${dano} de dano.`, "texto-dialogo", () => {
    atualizarBarras();
    if (ronnie.vida <= 0) {
      encerrarCombate("vitoria");
    } else {
      setTimeout(turnoRonnie, 1000);
    }
  });
}

// 📌 Encerrar o combate
function encerrarCombate(resultado) {
  const menuCombate = document.getElementById("menu-combate");
  const painelOpcoes = document.getElementById("painel-opcoes");

  if (menuCombate) menuCombate.style.display = "none";
  if (painelOpcoes) painelOpcoes.style.display = "none";

  if (resultado === "vitoria") {
    escreverTextoGradualmente("Você venceu o combate! Ronnie foi derrotado, mas a jornada continua...", "texto-dialogo");
  } else if (resultado === "derrota") {
    escreverTextoGradualmente("Você foi derrotado... Ronnie sorri e diz: 'Volte quando estiver pronto!'", "texto-dialogo");
  }

  // Opcional: Parar música, resetar variáveis, mostrar botões de continuar ou reiniciar, etc.
}

}
