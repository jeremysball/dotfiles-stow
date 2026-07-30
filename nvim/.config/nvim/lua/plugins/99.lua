-- ThePrimeagen/99 — Neovim AI agent, configured to use the Claude Code CLI backend
return {
  { "saghen/blink.compat", version = "2.*", lazy = true },
  {
    "ThePrimeagen/99",
    dependencies = { "saghen/blink.compat" },
    config = function()
      local _99 = require("99")
      _99.setup({
        provider = _99.Providers.ClaudeCodeProvider,
        completion = { source = "blink" },
      })

      vim.keymap.set("v", "<leader>9v", function()
        _99.visual()
      end, { desc = "99: Visual AI prompt" })

      vim.keymap.set("n", "<leader>9s", function()
        _99.search()
      end, { desc = "99: Search AI prompt" })

      vim.keymap.set("n", "<leader>9x", function()
        _99.stop_all_requests()
      end, { desc = "99: Stop all requests" })

      vim.keymap.set("n", "<leader>9m", function()
        require("99.extensions.fzf_lua").select_model()
      end, { desc = "99: Select model" })

      vim.keymap.set("n", "<leader>9p", function()
        require("99.extensions.fzf_lua").select_provider()
      end, { desc = "99: Select provider" })
    end,
  },
}
