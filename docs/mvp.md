# MVP do StudyPet

## Objetivo

Transformar o estudo de cursos em uma rotina visível e gentil: o usuário escolhe uma aula, conclui ciclos de foco, faz pausas sugeridas e vê seu personagem progredir.

## Loop principal

1. Selecionar curso, módulo e aula.
2. Escolher ou aceitar a duração sugerida do ciclo de foco.
3. Estudar, podendo pausar ou encerrar a qualquer momento.
4. Concluir a sessão e registrar o avanço da aula.
5. Durante o foco, os slimes chegam em waves de 4 sem parar e o pet derrota um por minuto; ao concluir, receber XP, moedas e uma sugestão opcional de descanso.
6. Retornar ao painel com a evolução do personagem e da meta diária.

## Regras iniciais

- XP base: soma dos slimes derrotados. Os slimes vêm em waves de 4, uma a cada 4 minutos de foco: um é derrotado ao fim de cada minuto e a wave seguinte entra quando o último cai, para a ação não parar. Cada slime é sorteado com a semente da sessão: lilás (60%, 5 Exp), azul (28%, 10 Exp) ou rosado (12%, 15 Exp). Todo 60º slime derrotado pelo usuário, somando todas as sessões, é um Slime Rei (30 Exp).
- Formas do pet: Semente (nível 1), Broto (10), Muda (25) e Florescido (50). Subir do nível N para o N+1 custa 20 × N^1,35 XP, arredondado para múltiplos de 5.
- Primeira sessão do dia: bônus de 10%.
- Meta diária concluída: bônus de 20%.
- Pausa sugerida: 5 minutos até 30 minutos de foco, 10 até 60, 15 até 90 e 25 acima disso.
- Pausas são recomendações e nunca reduzem recompensas quando ignoradas.

## Fora do MVP

- Integração automática com plataformas de cursos.
- Ranking global, amigos e desafios.
- Loja extensa, grupos de estudo e múltiplos personagens.

O primeiro recurso social será um ranking semanal opt-in somente entre amigos aceitos, priorizando dias ativos e consistência.
