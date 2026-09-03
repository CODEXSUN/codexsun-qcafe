# Control plane

The control plane owns desired state, module registration, deployment records, agent planning, and operator views.

The `api` surface provides runtime contracts. The `web` surface provides the operator interface.

Keep execution providers behind framework contracts. Do not run generated application code in either surface.
