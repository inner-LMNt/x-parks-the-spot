{
  description = "X Parks The Spot";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    poetry2nix = {
      url = "github:nix-community/poetry2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      poetry2nix,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ poetry2nix.overlays.default ];
        pkgs = import nixpkgs { inherit system overlays; };
        lib = nixpkgs.lib;
        backend = pkgs.poetry2nix.mkPoetryEnv {
          projectDir = ./backend;
          preferWheels = true;
          overrides = pkgs.poetry2nix.overrides.withDefaults (
            self: super:
            (lib.listToAttrs (
              lib.map
                (x: {
                  name = x;
                  value = super."${x}".overridePythonAttrs (old: {
                    nativeBuildInputs = (old.nativeBuildInputs or [ ]) ++ [
                      self.setuptools
                      pkgs.postgresql_16.dev
                    ];
                  });
                })
                [
                  "types-cffi"
                  "psycopg-c"
                ]
            ))
          );
        };
      in
      {
        devShells.backend = backend.env;
      }
    );
}
