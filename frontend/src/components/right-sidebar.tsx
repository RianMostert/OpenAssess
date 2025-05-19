import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface RightSidebarProps {
    width: number
}

export default function RightSidebar(width: RightSidebarProps) {
    return (
        <div className="flex flex-col overflow-hidden">
            <Accordion type="multiple" className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="pl-2">Item 1</AccordionTrigger>
                    <AccordionContent className="pl-2">Content 1</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger className="pl-2">Item 2</AccordionTrigger>
                    <AccordionContent className="pl-2">Content 2</AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
