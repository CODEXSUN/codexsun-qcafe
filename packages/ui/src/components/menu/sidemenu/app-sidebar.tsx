import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { SearchForm } from "./search-form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "../../../components/ui/sidebar"

export type AppSidebarItem = {
  id: string
  isActive?: boolean
  title: string
  url?: string
}

export type AppSidebarGroup = {
  defaultOpen?: boolean
  id: string
  items: AppSidebarItem[]
  title: string
}

export type AppSidebarNavigation = {
  groups: AppSidebarGroup[]
  id: string
  searchPlaceholder?: string
  hideSearch?: boolean
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  annotate?: (id: string, children: React.ReactNode) => React.ReactNode
  headerActions?: React.ReactNode
  navigation: AppSidebarNavigation
  onItemSelect?: (item: AppSidebarItem) => void
}

export function AppSidebar({ navigation, headerActions, onItemSelect, annotate = (_id, children) => children, ...props }: AppSidebarProps) {
  const [query, setQuery] = React.useState("")
  React.useEffect(() => setQuery(""), [navigation.id])
  const groups = navigation.groups.map((group) => ({ ...group, items: group.items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())) }))
  return (
      <Sidebar {...props}>
        <SidebarHeader>
          {!navigation.hideSearch && <SearchForm placeholder={navigation.searchPlaceholder} query={query} onQueryChange={setQuery} />}
          {headerActions}
        </SidebarHeader>
        <SidebarContent key={navigation.id} className="[scrollbar-width:thin] transition-opacity duration-200 ease-out">
          <SidebarGroup>
            <SidebarMenu>
              {groups.map((group, groupIndex) => (
                  <Collapsible
                      key={group.id}
                      defaultOpen={group.defaultOpen}
                      className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      {annotate(`11.${groupIndex + 1}`, <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="cursor-pointer">
                          {group.title}
                          <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                          <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>)}
                      {group.items.length ? (
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {group.items.map((item, itemIndex) => (
                                  <SidebarMenuSubItem key={item.title}>
                                    {annotate(`11.${groupIndex + 1}.${itemIndex + 1}`, <SidebarMenuSubButton
                                        asChild
                                        isActive={item.isActive}
                                    >
                                      <a
                                        href={item.url ?? "#"}
                                        onClick={(event) => {
                                          if (!item.url) event.preventDefault()
                                          onItemSelect?.(item)
                                        }}
                                      >
                                        {item.title}
                                      </a>
                                    </SidebarMenuSubButton>)}
                                  </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                      ) : null}
                    </SidebarMenuItem>
                  </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
  )
}
