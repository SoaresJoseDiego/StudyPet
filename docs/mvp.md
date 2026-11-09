# MVP do StudyPet

## Objetivo

Transformar o estudo de cursos em uma rotina visível e gentil: o usuário escolhe uma aula, conclui ciclos de foco, faz pausas sugeridas e vê seu personagem progredir.

## Loop principal

1. Selecionar curso, módulo e aula.
2. Escolher ou aceitar a duração sugerida do ciclo de foco.
3. Estudar, podendo pausar ou encerrar a qualquer momento.
4. Concluir a sessão e registrar o avanço da aula.
5. Durante o foco, o pet derrota um slime por minuto; ao concluir, receber XP, moedas e uma sugestão opcional de descanso.
6. Retornar ao painel com a evolução do personagem e da meta diária.

## Regras iniciais

- XP base: soma dos slimes derrotados. Cada minuto de foco traz um slime, num padrão fixo de 8 minutos (lilás 20, azul 30, lilás, lilás, rosado 50, lilás, azul, lilás). O 25º minuto de cada bloco de 25 é o Slime Rei (100). Uma sessão de 25 minutos vale 730 Exp.
- Formas do pet: Semente (nível 1), Broto (10), Muda (25) e Florescido (50). Subir do nível N para o N+1 custa N × 100 XP.
- Primeira sessão do dia: bônus de 10%.
- Meta diária concluída: bônus de 20%.
- Pausa sugerida: 5 minutos até 30 minutos de foco, 10 até 60, 15 até 90 e 25 acima disso.
- Pausas são recomendações e nunca reduzem recompensas quando ignoradas.

## Fora do MVP

- Integração automática com plataformas de cursos.
- Ranking global, amigos e desafios.
- Loja extensa, grupos de estudo e múltiplos personagens.

O primeiro recurso social será um ranking semanal opt-in somente entre amigos aceitos, priorizando dias ativos e consistência.
