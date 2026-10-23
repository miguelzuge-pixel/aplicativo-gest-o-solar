# Energia Smart — Gestão Energética Residencial

Dashboard educacional de eficiência energética com Node.js, Express, WebSocket, JavaScript puro e Chart.js. As leituras são **simuladas**; não conecte este projeto a equipamentos elétricos sem uma camada de integração real, segurança e validação.

## Requisitos

- Node.js 18 ou superior: https://nodejs.org/
- Visual Studio Code: https://code.visualstudio.com/
- Navegador moderno (Chrome, Firefox ou Edge)
- Internet para carregar Chart.js, Lucide e Google Fonts por CDN.

## Executar localmente

```bash
npm install
npm start
```

Abra http://localhost:3000. O servidor gera uma leitura a cada 3 segundos.

Para reiniciar automaticamente o servidor ao editar arquivos (Node 18.11+):

```bash
npm run dev
```

## Estrutura

```text
gestao-energetica/
├── server.js
├── package.json
├── README.md
├── data/
│   └── devices.json
└── public/
    ├── index.html
    ├── css/
    │   ├── style.css
    │   └── themes.css
    ├── js/
    │   ├── main.js
    │   ├── dashboard.js
    │   ├── analytics.js
    │   ├── alerts.js
    │   ├── simulator.js
    │   ├── settings.js
    │   └── utils.js
    └── assets/
        └── icons/
```

A pasta `public/assets/icons/` pode receber ícones SVG próprios. Nesta versão os ícones são carregados via Lucide CDN.

## Endpoints REST

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/health` | Estado do servidor |
| GET | `/api/consumption` | Leitura atual e histórico recente |
| GET | `/api/devices` | Catálogo de equipamentos |
| PUT | `/api/devices/:id` | Atualiza campos permitidos de um equipamento |
| GET | `/api/report` | Histórico e catálogo para relatórios |

Exemplo de leitura:

```json
{
  "type": "consumption",
  "timestamp": "2026-10-21T20:00:00.000Z",
  "powerKw": 1.247,
  "totalWatts": 1247,
  "devices": [
    { "id": "fridge", "name": "Geladeira", "room": "Cozinha", "watts": 180, "active": true }
  ],
  "simulated": true
}
```

O WebSocket transmite:
- `initial`: leitura atual + histórico ao conectar.
- `consumption`: nova leitura, aproximadamente a cada 3 segundos.
- `devices-updated`: catálogo atualizado após alteração de equipamento.

## Persistência e limites

- Configurações de tarifa/meta e tema: `localStorage` do navegador.
- Catálogo: `data/devices.json` no servidor.
- Histórico de leituras: memória do processo; é perdido quando o servidor reinicia.
- Em plataformas de hospedagem com sistema de arquivos efêmero, alterações em `devices.json` podem não persistir após reinício/deploy.
- O gráfico de 7/30 dias usa apenas leituras coletadas desde que o processo iniciou; não inventa histórico real. A estimativa diária/mensal usa potência nominal e horas de uso configuradas.

## Testes manuais

1. Acesse `/api/health` e confirme `status: "ok"`.
2. Acesse `/api/consumption`; `timestamp` e `powerKw` devem mudar com o tempo.
3. Abra o dashboard e observe o indicador e os gráficos mudarem a cada poucos segundos.
4. Alterne entre 24h, 7 dias e 30 dias.
5. Edite tarifa e meta; recarregue a página e confirme que persistem no navegador.
6. Mude o controle de economia e confirme que o valor mensal estimado muda.
7. Exporte CSV e JSON e abra os arquivos baixados.
8. Observe a central de alertas quando houver pico aleatório na simulação.

## Publicar no GitHub e hospedar

O GitHub Pages hospeda arquivos estáticos, mas **não executa Node.js nem WebSocket**. Para usar esta aplicação completa, publique o repositório no GitHub e faça o deploy em um serviço de hospedagem Node.js que suporte aplicações persistentes e WebSocket. Configure a porta via `process.env.PORT` (já suportado). Consulte a documentação e os limites atuais do provedor escolhido antes de publicar.

## Boas práticas / produção

Este projeto é uma demonstração, não um sistema de medição ou faturamento. Antes de produção, adicione autenticação, autorização, validação robusta, rate limiting, logs estruturados, persistência real (banco de dados), testes automatizados, HTTPS/WSS, gestão de segredos e revisão de acessibilidade. Nunca exponha dados domésticos reais sem controles de segurança.
