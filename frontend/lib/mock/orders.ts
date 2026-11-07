// Gerado por scripts/gen_mock.py a partir de data/*.csv. Não editar à mão.
// Só para desenvolver o front-end até o backend Python existir.
// Server-only: contém o contato usado só na verificação de identidade (LGPD).
import "server-only";
import type { Order } from "@/lib/orders";

export type MockOrder = Order & { _contato: { telefone: string; email: string; nome: string } };

export const ORDERS: MockOrder[] = [
  {
    "numero": 1,
    "status": "delivered",
    "data": "2025-10-15",
    "itens": [
      {
        "nome": "Martin D-28 Dreadnought Natural",
        "quantidade": 1
      }
    ],
    "total": 11499.0,
    "pagamento": "Pix",
    "rastreio": "BRAB1234567BR",
    "previsao": "2025-10-25",
    "motivo": null,
    "_contato": {
      "telefone": "67984321098",
      "email": "pedro.oliveira@jmail.com",
      "nome": "Pedro"
    }
  },
  {
    "numero": 2,
    "status": "delivered",
    "data": "2025-11-02",
    "itens": [
      {
        "nome": "Taylor 110e Dreadnought Natural",
        "quantidade": 1
      }
    ],
    "total": 5999.0,
    "pagamento": "Crédito 6x",
    "rastreio": "BRCX9876543BR",
    "previsao": "2025-11-15",
    "motivo": null,
    "_contato": {
      "telefone": "67983216543",
      "email": "thiago.barbosa@jmail.com",
      "nome": "Thiago"
    }
  },
  {
    "numero": 3,
    "status": "delivered",
    "data": "2025-11-20",
    "itens": [
      {
        "nome": "Kala KA-ABP-CTG Barítono Cedar",
        "quantidade": 2
      }
    ],
    "total": 3450.0,
    "pagamento": "Crédito 12x",
    "rastreio": "BRDZ4561230BR",
    "previsao": "2025-12-05",
    "motivo": null,
    "_contato": {
      "telefone": "67996789012",
      "email": "isabela.moreira@jmail.com",
      "nome": "Isabela"
    }
  },
  {
    "numero": 4,
    "status": "delivered",
    "data": "2025-12-10",
    "itens": [
      {
        "nome": "Giannini GF-3D Dreadnought Sunburst",
        "quantidade": 1
      }
    ],
    "total": 799.9,
    "pagamento": "Boleto",
    "rastreio": "BRQM7890123BR",
    "previsao": "2025-12-22",
    "motivo": null,
    "_contato": {
      "telefone": "67998123456",
      "email": "lucas.mendes@jmail.com",
      "nome": "Lucas"
    }
  },
  {
    "numero": 5,
    "status": "delivered",
    "data": "2026-01-05",
    "itens": [
      {
        "nome": "Crafter D-8 Dreadnought Natural",
        "quantidade": 1
      }
    ],
    "total": 4599.0,
    "pagamento": "Pix",
    "rastreio": "BRTP3456789BR",
    "previsao": "2026-01-18",
    "motivo": null,
    "_contato": {
      "telefone": "67987654321",
      "email": "rafael.pereira@jmail.com",
      "nome": "Rafael"
    }
  },
  {
    "numero": 6,
    "status": "delivered",
    "data": "2026-01-18",
    "itens": [
      {
        "nome": "Taylor 214ce Elétrico Aço Natural",
        "quantidade": 1
      }
    ],
    "total": 7499.0,
    "pagamento": "Crédito 12x",
    "rastreio": "BRVN6543210BR",
    "previsao": "2026-02-01",
    "motivo": null,
    "_contato": {
      "telefone": "67986543210",
      "email": "gabriel.araujo@jmail.com",
      "nome": "Gabriel"
    }
  },
  {
    "numero": 7,
    "status": "delivered",
    "data": "2026-02-03",
    "itens": [
      {
        "nome": "Shelby SU-21S Soprano Sunburst",
        "quantidade": 1
      }
    ],
    "total": 159.9,
    "pagamento": "Crédito 3x",
    "rastreio": "BRKR1122334BR",
    "previsao": "2026-02-17",
    "motivo": null,
    "_contato": {
      "telefone": "67997890123",
      "email": "leticia.rocha@jmail.com",
      "nome": "Letícia"
    }
  },
  {
    "numero": 8,
    "status": "shipped",
    "data": "2026-02-15",
    "itens": [
      {
        "nome": "Kala KA-C Concert Mogno",
        "quantidade": 1
      }
    ],
    "total": 349.9,
    "pagamento": "Débito",
    "rastreio": "BRJL5544332BR",
    "previsao": "2026-02-28",
    "motivo": null,
    "_contato": {
      "telefone": "67996547821",
      "email": "anacarol.ferreira@coldmail.com",
      "nome": "Ana"
    }
  },
  {
    "numero": 9,
    "status": "confirmed",
    "data": "2026-02-20",
    "itens": [
      {
        "nome": "Kala KA-C Concert Mogno",
        "quantidade": 1
      }
    ],
    "total": 349.9,
    "pagamento": "Crédito 6x",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67992345678",
      "email": "juliana.almeida@hayoo.com.br",
      "nome": "Juliana"
    }
  },
  {
    "numero": 10,
    "status": "confirmed",
    "data": "2026-02-25",
    "itens": [
      {
        "nome": "Music Man Bass 1X Electric Bass",
        "quantidade": 1
      }
    ],
    "total": 8732.0,
    "pagamento": "Pix",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67985432109",
      "email": "bruno.martins@jmail.com",
      "nome": "Bruno"
    }
  },
  {
    "numero": 11,
    "status": "confirmed",
    "data": "2026-03-05",
    "itens": [
      {
        "nome": "Kalani KAL-700T Tenor Natural",
        "quantidade": 1
      }
    ],
    "total": 359.0,
    "pagamento": "Boleto",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67991234567",
      "email": "mariana.costa@inlook.com",
      "nome": "Mariana"
    }
  },
  {
    "numero": 12,
    "status": "confirmed",
    "data": "2026-03-10",
    "itens": [
      {
        "nome": "Kala KA-B Barítono Mogno",
        "quantidade": 1
      }
    ],
    "total": 599.0,
    "pagamento": "Crédito 3x",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67998901234",
      "email": "patricia.cardoso@jmail.com",
      "nome": "Patrícia"
    }
  },
  {
    "numero": 13,
    "status": "pending",
    "data": "2026-03-12",
    "itens": [
      {
        "nome": "Ohana BK-35E Barítono Elétrico Natural",
        "quantidade": 1
      }
    ],
    "total": 1899.0,
    "pagamento": "Pix",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67994567890",
      "email": "fernanda.ribeiro@coldmail.com",
      "nome": "Fernanda"
    }
  },
  {
    "numero": 14,
    "status": "pending",
    "data": "2026-03-15",
    "itens": [
      {
        "nome": "Kala KA-ABP-CTG Barítono Cedar",
        "quantidade": 1
      }
    ],
    "total": 1749.0,
    "pagamento": "Débito",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67982109876",
      "email": "diego.castro@coldmail.com",
      "nome": "Diego"
    }
  },
  {
    "numero": 15,
    "status": "pending",
    "data": "2026-03-18",
    "itens": [
      {
        "nome": "Yamaha C70 Nylon Natural",
        "quantidade": 1
      },
      {
        "nome": "Taylor 214ce Elétrico Aço Natural",
        "quantidade": 1
      }
    ],
    "total": 8348.0,
    "pagamento": "Crédito 12x",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67999012345",
      "email": "aline.monteiro@jmail.com",
      "nome": "Aline"
    }
  },
  {
    "numero": 16,
    "status": "pending",
    "data": "2026-03-22",
    "itens": [
      {
        "nome": "Tagima Memphis AC-39 Nylon Natural",
        "quantidade": 1
      }
    ],
    "total": 429.9,
    "pagamento": "Crédito 6x",
    "rastreio": null,
    "previsao": null,
    "motivo": null,
    "_contato": {
      "telefone": "67995678901",
      "email": "camila.duarte@inlook.com",
      "nome": "Camila"
    }
  },
  {
    "numero": 17,
    "status": "cancelled",
    "data": "2026-01-28",
    "itens": [
      {
        "nome": "Giannini GN-15 Nylon Cedr Natural",
        "quantidade": 1
      }
    ],
    "total": 689.0,
    "pagamento": "Pix",
    "rastreio": null,
    "previsao": null,
    "motivo": "Pedido cancelado pelo cliente antes do processamento",
    "_contato": {
      "telefone": "67981098765",
      "email": "matheus.correia@hayoo.com.br",
      "nome": "Matheus"
    }
  },
  {
    "numero": 18,
    "status": "cancelled",
    "data": "2026-02-08",
    "itens": [
      {
        "nome": "Rozini RC-104 Nylon Estudante",
        "quantidade": 1
      }
    ],
    "total": 459.9,
    "pagamento": "Crédito 12x",
    "rastreio": null,
    "previsao": null,
    "motivo": "Item fora de estoque no momento do pedido",
    "_contato": {
      "telefone": "67980987654",
      "email": "gustavo.nunes@inlook.com",
      "nome": "Gustavo"
    }
  },
  {
    "numero": 19,
    "status": "cancelled",
    "data": "2026-02-22",
    "itens": [
      {
        "nome": "Taylor 214ce Elétrico Aço Natural",
        "quantidade": 1
      }
    ],
    "total": 7499.0,
    "pagamento": "Boleto",
    "rastreio": null,
    "previsao": null,
    "motivo": "Pagamento não confirmado dentro do prazo",
    "_contato": {
      "telefone": "67984321098",
      "email": "pedro.oliveira@jmail.com",
      "nome": "Pedro"
    }
  },
  {
    "numero": 20,
    "status": "cancelled",
    "data": "2026-03-08",
    "itens": [
      {
        "nome": "Shelby SGD-195E Elétrico Aço Sunburst",
        "quantidade": 1
      },
      {
        "nome": "Giannini GN-15 Nylon Cedr Natural",
        "quantidade": 1
      }
    ],
    "total": 1400.0,
    "pagamento": "Crédito 3x",
    "rastreio": null,
    "previsao": null,
    "motivo": "Endereço de entrega inválido informado pelo cliente",
    "_contato": {
      "telefone": "67983216543",
      "email": "thiago.barbosa@jmail.com",
      "nome": "Thiago"
    }
  }
];
